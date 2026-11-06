// TIP-040 pha 2b (AC04, AC05) trên Postgres thật — provider LLM qua ngữ cảnh nền tảng (DC-371):
//   - key + giá trị header là bí mật: canary không xuất hiện ở DB (ngoài cột mã hoá), GET /admin/config, preview, audit, admin_operation.
//   - base_url: localhost / IP nội bộ / metadata / userinfo → 422; host trong allowlist triển khai (`LLM_PRIVATE_HOSTS`) được.
//   - đổi host mà không nhập lại key → 422; xoá key → provider tắt; CAS if_version.
//   - probe gọi THẬT vào server OpenAI-compatible giả cục bộ: chat + tools đạt, embed không có model → unsupported (không suy từ chat);
//     server trả 401 → `auth`, không chép thân lỗi; probe liền nhau → 429.
//   - tắt provider → ProviderStore của tiến trình khác không trả provider đó trong ≤ 2 giây (thế hệ cấu hình).
import 'reflect-metadata';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ProviderStore, uuidv7 } from '@appchat/core';
import { env, startApi, testEmail, type Harness } from './setup';

const CANARY_KEY = `sk-CANARY-${uuidv7().slice(-8)}`;
const CANARY_HDR = `HDR-CANARY-${uuidv7().slice(-8)}`;
let h: Harness;
let admin: { id: string; token: string };
let llm: Server;
let base = '';
let mode: 'ok' | 'auth' = 'ok';
const seen: string[] = [];
const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown, token = admin.token) =>
  fetch(`${h.base}/v1/actions/${id}`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, 'idempotency-key': uuidv7() }, body: JSON.stringify({ input }) }).then(json);
const KEY = `pv${uuidv7().slice(-6)}`;

/** Server OpenAI-compatible tối thiểu: chat (không stream) — có tools thì gọi tool; ghi header nhận được. */
function fakeLlm(): Promise<Server> {
  const s = createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      seen.push(`${req.headers.authorization ?? ''}|${req.headers['x-canary'] ?? ''}`);
      if (mode === 'auth') {
        res.writeHead(401, { 'content-type': 'application/json' }).end(JSON.stringify({ error: { message: `bad key ${CANARY_KEY} secret-body` } }));
        return;
      }
      const b = JSON.parse(raw || '{}') as { tools?: unknown[] };
      const message = b.tools?.length
        ? { role: 'assistant', content: null, tool_calls: [{ id: 'c1', type: 'function', function: { name: 'ping', arguments: '{}' } }] }
        : { role: 'assistant', content: 'ok' };
      res.writeHead(200, { 'content-type': 'application/json' }).end(
        JSON.stringify({ id: 'x', object: 'chat.completion', created: 1, model: 'm', choices: [{ index: 0, message, finish_reason: b.tools?.length ? 'tool_calls' : 'stop' }], usage: { prompt_tokens: 3, completion_tokens: 1, total_tokens: 4 } }),
      );
    });
  });
  return new Promise((r) => s.listen(0, '127.0.0.1', () => r(s)));
}

beforeAll(async () => {
  llm = await fakeLlm();
  const port = (llm.address() as AddressInfo).port;
  base = `http://127.0.0.1:${port}/v1`;
  env.LLM_PRIVATE_HOSTS = `127.0.0.1:${port},llm-alt.internal.test`;
  h = await startApi();
  admin = { id: uuidv7(), token: '' };
  h.track(admin.id);
  await h.platform.user.create({ data: { id: admin.id, email: testEmail('pvadmin'), name: 'Pv Admin', isPlatformAdmin: true } });
  admin.token = h.tokenFor(admin.id);
}, 240_000);
afterAll(async () => {
  delete env.LLM_PRIVATE_HOSTS;
  await h?.platform.llmProvider.deleteMany({ where: { key: KEY } });
  await h?.platform.adminOperation.deleteMany({ where: { actorUserId: admin.id } });
  await h?.platform.platformAuditLog.deleteMany({ where: { actorUserId: admin.id } });
  await h?.close();
  await new Promise((r) => llm?.close(r));
});

describe('admin.llm_provider.* (AC04 / AC05)', () => {
  it('URL nội bộ / metadata / userinfo bị chặn; host allowlist được', async () => {
    const up = (base_url: string) => act('admin.llm_provider.upsert', { key: `${KEY}x`, kind: 'openai_compatible', name: 'x', base_url, api_key: CANARY_KEY });
    for (const [u, why] of [
      ['http://localhost:8080/v1', 'host'],
      ['http://10.0.0.5/v1', 'private_address'],
      ['http://169.254.169.254/latest', 'private_address'],
      ['https://user:pw@api.example.com/v1', 'userinfo'],
      ['http://127.0.0.1:1/v1', 'port'],
    ] as const)
      expect((await up(u)).body.error.fields, u).toEqual({ base_url: why });
    expect(await h.platform.llmProvider.count({ where: { key: `${KEY}x` } })).toBe(0);
  });

  it('bí mật không lộ; đổi host cần key mới; probe thật; tắt → tiến trình khác ngừng dùng', async () => {
    const c = await act('admin.llm_provider.upsert', { key: KEY, kind: 'openai_compatible', name: '9router test', base_url: base, api_key: CANARY_KEY, headers: { 'x-canary': CANARY_HDR } });
    expect(c.status, JSON.stringify(c.body)).toBe(200);
    expect(c.body.data.result).toEqual({ key: KEY, version: 1, created: true, status: 'active' });
    const row = await h.platform.llmProvider.findUniqueOrThrow({ where: { key: KEY } });
    expect(JSON.stringify({ ...row, apiKeyEnc: null, headersEnc: null })).not.toMatch(/CANARY/);
    expect(row.headers).toEqual(['x-canary']);
    const read = JSON.stringify((await fetch(`${h.base}/v1/admin/config/providers`, { headers: { authorization: `Bearer ${admin.token}` } }).then(json)).body);
    const audits = JSON.stringify(await h.platform.platformAuditLog.findMany({ where: { actorUserId: admin.id } }));
    const receipts = JSON.stringify(await h.platform.adminOperation.findMany({ where: { actorUserId: admin.id } }));
    for (const s of [read, audits, receipts]) expect(s).not.toMatch(/CANARY/);
    expect((await act('admin.llm_provider.upsert', { key: KEY, if_version: 1, kind: 'openai_compatible', name: 'x', base_url: 'http://llm-alt.internal.test/v1' })).body.error.fields).toEqual({ api_key: 'required_on_host_change' });

    // Probe: chat + tools đạt qua server giả (header bí mật tới đúng provider), embed không có model → unsupported.
    const p = await act('admin.llm_provider.probe', { key: KEY, if_version: 1, chat_model: 'm', embed_model: null, capabilities: ['chat', 'tools', 'embeddings'] });
    expect(p.status, JSON.stringify(p.body)).toBe(200);
    expect(p.body.data.result.checks.map((x: { capability: string; ok: boolean; error?: string }) => [x.capability, x.ok, x.error ?? null])).toEqual([
      ['chat', true, null],
      ['tools', true, null],
      ['embeddings', false, 'unsupported'],
    ]);
    expect(seen.at(-1)).toBe(`Bearer ${CANARY_KEY}|${CANARY_HDR}`);
    const after = await h.platform.llmProvider.findUniqueOrThrow({ where: { key: KEY } });
    expect(after.capabilities).toMatchObject({ tools: true, embeddings: false });
    expect(after.version).toBe(2);
    expect((await act('admin.llm_provider.probe', { key: KEY, if_version: 2, chat_model: 'm', capabilities: ['chat'] })).status).toBe(429);

    // Provider trả 401 kèm thân chứa key → chỉ lưu mã `auth`, không chép thân.
    mode = 'auth';
    await h.platform.llmProvider.update({ where: { key: KEY }, data: { lastProbeAt: null } });
    const bad = await act('admin.llm_provider.probe', { key: KEY, if_version: 2, chat_model: 'm', capabilities: ['chat'] });
    mode = 'ok';
    expect(bad.body.data.result.checks).toEqual([{ capability: 'chat', ok: false, latency_ms: expect.any(Number), error: 'auth' }]);
    const failed = await h.platform.llmProvider.findUniqueOrThrow({ where: { key: KEY } });
    expect(failed.lastError).toBe('chat:auth');
    expect(JSON.stringify(await h.platform.platformAuditLog.findMany({ where: { actorUserId: admin.id } }))).not.toMatch(/CANARY|secret-body/);

    // Tắt provider: tiến trình khác (cache đã nạp) ngừng trả provider trong ≤ 2 giây — không đợi TTL 60 giây.
    const raw = env.APP_ENC_KEY!;
    const other = new ProviderStore(h.platform, /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64'));
    expect((await other.provider(KEY))?.headers).toEqual({ 'x-canary': CANARY_HDR });
    expect((await act('admin.llm_provider.disable', { key: KEY, if_version: 2, status: 'disabled' })).status).toBe(409);
    const d = await act('admin.llm_provider.disable', { key: KEY, if_version: failed.version, status: 'disabled' });
    expect(d.body.data.result.status).toBe('disabled');
    await new Promise((r) => setTimeout(r, 2_100));
    expect(await other.provider(KEY)).toBeNull();

    // Xoá key → provider tắt và không bật lại được khi thiếu key.
    const v = d.body.data.result.version;
    expect((await act('admin.llm_provider.upsert', { key: KEY, if_version: v, kind: 'openai_compatible', name: 'x', api_key: null })).body.data.result.status).toBe('disabled');
    expect((await act('admin.llm_provider.disable', { key: KEY, if_version: v + 1, status: 'active' })).body.error.fields).toEqual({ api_key: 'missing' });
  }, 90_000);

  it('người không phải admin nền tảng → 403', async () => {
    expect((await act('admin.llm_provider.upsert', { key: KEY, kind: 'openai', name: 'x', api_key: CANARY_KEY }, h.token)).status).toBe(403);
  });
});
