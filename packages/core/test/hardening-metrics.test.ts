// TIP-045b AC2 / annex B — metric tiến trình: action qua executor đếm theo kết quả, lời gọi model ghi token / độ trễ / lỗi / credit, nhãn
// chỉ thuộc tập hữu hạn (không workspace / user / run id), dựng lại registry không đăng ký trùng, listener worker chỉ phục vụ GET /metrics
// cho loopback không qua proxy hoặc Bearer token, sampler lỗi không làm hỏng lượt scrape.
import { afterEach, describe, expect, it } from 'vitest';
import type { IncomingMessage } from 'node:http';
import type { AddressInfo } from 'node:net';
import { AppError } from '@appchat/shared';
import type { ActionExecutor } from '../src/kernel/actions/executor';
import { instrumentExecutor, meteredProcessor, queueFamily } from '../src/kernel/metrics/collectors';
import { recordLlmError, recordLlmUsage } from '../src/kernel/metrics/ai';
import { appMetrics, boundedLabel, resetMetrics } from '../src/kernel/metrics/registry';
import { metricsAllowed, onScrape, renderMetrics, startMetricsServer } from '../src/kernel/metrics/server';

afterEach(() => resetMetrics());

const fakeExecutor = (impl: (id: string) => { status: number; data: unknown }) =>
  ({ execute: async (_ctx: unknown, id: string) => impl(id) }) as unknown as ActionExecutor;
const ctx = (source: string) => ({ source, workspaceId: 'ws-secret-1', userId: 'u-secret-1' }) as never;

describe('metric nghiệp vụ', () => {
  it('action_total theo kết quả; id lạ ghi unknown; bọc hai lần không đếm đôi', async () => {
    const ex = fakeExecutor((id) => {
      if (id === 'contact.delete') throw new AppError('FORBIDDEN', 403);
      if (id === 'quote.send') return { status: 202, data: { status: 'preview_required' } };
      return { status: 200, data: {} };
    });
    const known = (id: string) => id !== 'evil.injected';
    instrumentExecutor(instrumentExecutor(ex, known), known);
    await ex.execute(ctx('ui'), 'contact.create', {});
    await ex.execute(ctx('assistant'), 'quote.send', {});
    await expect(ex.execute(ctx('ui'), 'contact.delete', {})).rejects.toThrow();
    await ex.execute(ctx('ui'), 'evil.injected', {});
    const { body } = await renderMetrics();
    expect(body).toContain('action_total{action="contact.create",source="ui",result="ok",service="appchat"} 1');
    expect(body).toContain('action="quote.send",source="assistant",result="preview"');
    expect(body).toContain('action="contact.delete",source="ui",result="FORBIDDEN"');
    expect(body).toContain('action="unknown"');
    expect(body).not.toContain('evil.injected');
  });

  it('model: token in/out, độ trễ, credit, lỗi; nhãn đã chặn ký tự lạ, không id tenant', async () => {
    recordLlmUsage({ provider: '9router', model: 'gpt-x', purpose: 'assistant', tokensIn: 120, tokensOut: 30, latencyMs: 1500, credits: 2 });
    recordLlmError(undefined, 'gpt-x', 'kb-suggest');
    const { body } = await renderMetrics();
    expect(body).toMatch(/llm_tokens_total\{provider="9router",model="gpt-x",purpose="assistant",kind="in"[^}]*\} 120/);
    expect(body).toMatch(/llm_tokens_total\{[^}]*kind="out"[^}]*\} 30/);
    expect(body).toMatch(/llm_request_duration_seconds_count\{[^}]*purpose="assistant"[^}]*\} 1/);
    expect(body).toMatch(/credit_charged_total\{purpose="assistant"[^}]*\} 2/);
    expect(body).toMatch(/llm_errors_total\{provider="unknown",model="gpt-x",purpose="kb-suggest"[^}]*\} 1/);
    for (const banned of ['ws-secret', 'u-secret']) expect(body).not.toContain(banned);
    const keys = new Set([...body.matchAll(/[{,]([a-z_]+)="/g)].map((x) => x[1]));
    for (const k of keys) expect(['service', 'provider', 'model', 'purpose', 'kind', 'action', 'source', 'result', 'queue', 'state', 'route', 'method', 'status', 'channel', 'type', 'le', 'version', 'major', 'minor', 'patch', 'space', 'kind']).toContain(k);
    expect(boundedLabel('a b"c\n')).toBe('a_b_c_');
    expect(boundedLabel('x', new Set(['y']))).toBe('other');
  });

  it('job theo họ queue, kết quả ok / error', async () => {
    expect(queueFamily('kb-ingest:0198abcd')).toBe('kb-ingest');
    await meteredProcessor('kb-ingest:0198', async () => 1)({});
    await expect(meteredProcessor('kb-ingest:0199', async () => Promise.reject(new Error('x')))({})).rejects.toThrow();
    const { body } = await renderMetrics();
    expect(body).toMatch(/job_duration_seconds_count\{[^}]*queue="kb-ingest",result="ok"[^}]*\} 1/);
    expect(body).toMatch(/job_duration_seconds_count\{[^}]*queue="kb-ingest",result="error"[^}]*\} 1/);
  });

  it('dựng lại registry không đăng ký trùng; metric mặc định Node có mặt; sampler lỗi bị bỏ qua', async () => {
    appMetrics('api');
    resetMetrics();
    const m = appMetrics('worker-jobs');
    const off = onScrape(() => {
      throw new Error('boom');
    });
    const off2 = onScrape(() => m.tenantPoolClients.set(3));
    const { body } = await renderMetrics();
    off();
    off2();
    expect(body).toContain('process_cpu_user_seconds_total');
    expect(body).toContain('tenant_pool_clients{service="worker-jobs"} 3');
  });
});

describe('cổng /metrics', () => {
  const req = (peer: string, headers: Record<string, string> = {}) => ({ socket: { remoteAddress: peer }, headers }) as unknown as IncomingMessage;

  it('loopback không qua proxy được đọc; có X-Forwarded-For hoặc IP ngoài thì không; token đúng thì được', () => {
    expect(metricsAllowed(req('127.0.0.1'), undefined)).toBe(true);
    expect(metricsAllowed(req('::1'), undefined)).toBe(true);
    expect(metricsAllowed(req('127.0.0.1', { 'x-forwarded-for': '1.2.3.4' }), undefined)).toBe(false);
    expect(metricsAllowed(req('203.0.113.9'), undefined)).toBe(false);
    expect(metricsAllowed(req('203.0.113.9', { authorization: 'Bearer tok-123' }), 'tok-123')).toBe(true);
    expect(metricsAllowed(req('203.0.113.9', { authorization: 'Bearer tok-124' }), 'tok-123')).toBe(false);
    expect(metricsAllowed(req('203.0.113.9', { authorization: 'Bearer tok' }), 'tok-123')).toBe(false);
  });

  it('listener worker: chỉ GET /metrics, 127.0.0.1; port không đặt thì không mở', async () => {
    expect(await startMetricsServer(undefined)).toBeNull();
    expect(await startMetricsServer(0)).toBeNull();
    appMetrics('worker-ai');
    const s = await startMetricsServerOnRandom();
    try {
      const { port, address } = s.address() as AddressInfo;
      expect(address).toBe('127.0.0.1');
      const ok = await fetch(`http://127.0.0.1:${port}/metrics`);
      expect(ok.status).toBe(200);
      expect(await ok.text()).toContain('service="worker-ai"');
      expect((await fetch(`http://127.0.0.1:${port}/other`)).status).toBe(404);
      expect((await fetch(`http://127.0.0.1:${port}/metrics`, { method: 'POST' })).status).toBe(404);
      expect((await fetch(`http://127.0.0.1:${port}/metrics`, { headers: { 'x-forwarded-for': '1.2.3.4' } })).status).toBe(404);
    } finally {
      await new Promise((ok) => s.close(ok));
    }
  });
});

/** `startMetricsServer` coi 0 là "không mở" (cấu hình); test chọn cổng trống trước rồi mở trên cổng đó. */
async function startMetricsServerOnRandom() {
  const { createServer } = await import('node:net');
  const probe = createServer();
  const port = await new Promise<number>((ok) => probe.listen(0, '127.0.0.1', () => ok((probe.address() as AddressInfo).port)));
  await new Promise((ok) => probe.close(ok));
  return (await startMetricsServer(port))!;
}
