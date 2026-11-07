// TIP-045b annex B / ops §1.3 — trace xuyên job: data job mang `trace_id` của RequestContext lúc enqueue (không ghi đè trace có sẵn, không
// đụng data không phải object), processor chạy trong ngữ cảnh { traceId, source: 'job', job, ws } nên log có trace, job không trace (lập
// lịch) sinh trace mới, trace dạng lạ bị thay; job_duration_seconds đo theo họ queue (id tài khoản không thành nhãn).
import { afterEach, describe, expect, it } from 'vitest';
import type { Job } from 'bullmq';
import { jobTraceId, tracedProcessor, withTrace } from '../src/kernel/jobs/with-job-context';
import { queueFamily } from '../src/kernel/metrics/collectors';
import { renderMetrics, resetMetrics } from '../src/kernel/metrics';
import { RequestContext } from '../src/kernel/request-context';

afterEach(() => resetMetrics());

const job = <D>(name: string, data: D) => ({ name, data }) as unknown as Job<D>;
const inCtx = <T>(traceId: string, fn: () => T) => RequestContext.run({ traceId, source: 'http' }, fn);

describe('trace khi enqueue', () => {
  it('gắn trace hiện tại; giữ trace có sẵn; ngoài ngữ cảnh / không phải object → giữ nguyên', () => {
    expect(inCtx('tr-1', () => withTrace({ workspaceId: 'w' }))).toEqual({ workspaceId: 'w', trace_id: 'tr-1' });
    expect(inCtx('tr-1', () => withTrace({ trace_id: 'tr-0' }))).toEqual({ trace_id: 'tr-0' });
    expect(inCtx('tr-1', () => withTrace({ traceId: 'ev-9' }))).toEqual({ traceId: 'ev-9' });
    expect(withTrace({ a: 1 })).toEqual({ a: 1 });
    expect(inCtx('tr-1', () => withTrace('chuỗi'))).toBe('chuỗi');
    expect(inCtx('tr-1', () => withTrace([1, 2]))).toEqual([1, 2]);
  });

  it('trace của job: trace_id / traceId hợp lệ; trống hoặc ký tự lạ → sinh mới', () => {
    expect(jobTraceId({ trace_id: 'abc-1' })).toBe('abc-1');
    expect(jobTraceId({ traceId: 'ev.2' })).toBe('ev.2');
    const fresh = jobTraceId({});
    expect(fresh).toMatch(/^[0-9a-f-]{36}$/);
    expect(jobTraceId({ trace_id: 'x\ny' })).not.toBe('x\ny');
    expect(jobTraceId(null)).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('trace khi chạy job', () => {
  it('processor thấy ngữ cảnh job với trace của lệnh gốc + workspace; kết quả / lỗi trả nguyên', async () => {
    const seen: unknown[] = [];
    const p = tracedProcessor('kb-ingest', async (j: Job<{ workspaceId: string }>) => {
      seen.push(RequestContext.get());
      return j.data.workspaceId;
    });
    const data = inCtx('tr-root', () => withTrace({ workspaceId: 'ws-1' }));
    expect(await p(job('ingest', data))).toBe('ws-1');
    expect(seen[0]).toMatchObject({ traceId: 'tr-root', source: 'job', job: 'ingest', ws: 'ws-1' });
    const bad = tracedProcessor('kb-ingest', async (): Promise<void> => Promise.reject(new Error('hỏng')));
    await expect(bad(job('ingest', {}))).rejects.toThrow('hỏng');
    // Ngữ cảnh không rò ra ngoài job.
    expect(RequestContext.get()).toBeUndefined();
  });

  it('hai job chạy song song giữ trace riêng', async () => {
    const out: string[] = [];
    const p = tracedProcessor('events', async (j: Job<{ traceId: string }>) => {
      await new Promise((r) => setTimeout(r, j.data.traceId === 'a' ? 15 : 1));
      out.push(`${j.data.traceId}:${RequestContext.get()!.traceId}`);
    });
    await Promise.all([p(job('e', { traceId: 'a' })), p(job('e', { traceId: 'b' }))]);
    expect(out.sort()).toEqual(['a:a', 'b:b']);
  });

  it('metric theo họ queue — id tài khoản động không thành nhãn', async () => {
    const acc = '0198f3a2-7c1d-7e55-9a10-3b2c4d5e6f70';
    expect(queueFamily(`chsend-${acc}`)).toBe('chsend');
    expect(queueFamily(`chgroup-${acc}`)).toBe('chgroup');
    expect(queueFamily('kb-ingest')).toBe('kb-ingest');
    await tracedProcessor(`chsend-${acc}`, async () => 1)(job('send', {}));
    const { body } = await renderMetrics();
    expect(body).toMatch(/job_duration_seconds_count\{[^}]*queue="chsend",result="ok"[^}]*\} 1/);
    expect(body).not.toContain(acc);
  });
});
