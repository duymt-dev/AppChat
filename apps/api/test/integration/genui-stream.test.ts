// TIP-023c 6a + SPEC vận hành trên Postgres 16 + Memurai: lượt Trợ lý ghi sổ sự kiện (run, seq) trong lúc chạy; request_id trùng → cùng run,
// không gọi model lần hai, khác input → 409; SSE GET /assistant/runs/:id/stream replay từ sổ theo cursor đã ký và kết thúc ở `done`;
// nối lại bằng cursor chỉ nhận phần sau; người khác biết run_id → 404, cursor của người khác → 403; migration genui_stream + EXPLAIN.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { AiSdkEngine, mockLanguageModel, staticModelSource, type MockScript } from '@appchat/ai';
import { ActionExecutor, AiRunner, AssistantService, CreditMeter, DbPriceBook, REDIS, WalletService, assistantTurn, createLogger, uuidv7, type AssistantDeps, type TurnRequest } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { authzForRole, streamFrameSchema, type StreamFrame } from '@appchat/shared';
import { env, startApi, type Harness } from './setup';

const PROVIDER = `t-${uuidv7().slice(-12)}`;
const MODEL = 'mock-chat';
const log = createLogger({ level: 'silent' });

let h: Harness;
let resolver: TenantDbResolver;
let other: { id: string; token: string };

beforeAll(async () => {
  h = await startApi();
  other = await h.member('sales');
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  await h.platform.modelPrice.create({ data: { providerKey: PROVIDER, model: MODEL, tier: 'standard', creditsPer1kIn: 1, creditsPer1kOut: 3 } });
  await h.app.get(WalletService, { strict: false }).topup(h.ws, 1000, { refType: 'test', refId: uuidv7() });
}, 120_000);
afterAll(async () => {
  await h?.platform.modelPrice.deleteMany({ where: { providerKey: PROVIDER } });
  await resolver?.close();
  await h?.close();
});

const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
let calls = 0;
function deps(script: MockScript): AssistantDeps {
  const model = mockLanguageModel(script, { provider: PROVIDER, model: MODEL });
  const spy = model.doStream.bind(model);
  model.doStream = async (o) => (calls++, spy(o));
  const engine = new AiSdkEngine(staticModelSource([{ provider: PROVIDER, model: MODEL, handle: model }]));
  const runner = new AiRunner({ engine, meter: new CreditMeter(h.app.get(WalletService, { strict: false }), new DbPriceBook(h.platform)), log });
  const kv = h.app.get(REDIS, { strict: false });
  return { executor: h.app.get(ActionExecutor, { strict: false }), runner, kv, pub: kv, now: () => h.clock.now(), planKey: async () => 'business' };
}
const owner = (): Pick<TurnRequest, 'ws' | 'userId' | 'authz' | 'userName' | 'locale' | 'role'> => ({ ws: h.ws, userId: h.user, authz: authzForRole('owner', h.user), userName: 'Owner', locale: 'vi', role: 'owner' });
const turn = async (script: MockScript, q: Partial<TurnRequest> & { text: string }) => assistantTurn(deps(script), await tenant(), { mode: 'chat', ...owner(), ...q });

/** Đọc SSE tới khi server đóng; trả các frame. */
async function sse(runId: string, token: string, cursor?: string): Promise<{ status: number; frames: StreamFrame[] }> {
  const r = await fetch(`${h.base}/v1/assistant/runs/${runId}/stream${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`, {
    headers: { authorization: `Bearer ${token}`, 'x-workspace-id': h.ws, accept: 'text/event-stream' },
    signal: AbortSignal.timeout(10_000),
  });
  if (r.status !== 200) return { status: r.status, frames: [] };
  const text = await r.text();
  const frames = text
    .split('\n\n')
    .map((b) => b.split('\n').find((l) => l.startsWith('data: ')))
    .filter((l): l is string => !!l)
    .map((l) => streamFrameSchema.parse(JSON.parse(l.slice(6))));
  return { status: 200, frames };
}

describe('sổ sự kiện + SSE', () => {
  it('lượt ghi sổ (delta … done); SSE replay đủ, kết thúc ở done; cursor nối lại chỉ nhận phần sau', async () => {
    const r = await turn([{ text: 'Chào anh, hôm nay có 3 hội thoại mới.' }], { text: 'tóm tắt', requestId: `req-${uuidv7()}` });
    const db = await tenant();
    const rows = await db.assistantEvent.findMany({ where: { runId: r.run_id! }, orderBy: { seq: 'asc' } });
    expect(rows.map((e) => e.eventType)).toEqual(['delta', 'done']);
    expect(rows.map((e) => e.seq)).toEqual([1, 2]);
    const all = await sse(r.run_id!, (await tokenOf(h.user)));
    expect(all.status).toBe(200);
    expect(all.frames.map((f) => [f.seq, f.event.type])).toEqual([[1, 'delta'], [2, 'done']]);
    expect(all.frames[0]!.event).toMatchObject({ type: 'delta', text: 'Chào anh, hôm nay có 3 hội thoại mới.' });
    const tail = await sse(r.run_id!, await tokenOf(h.user), all.frames[0]!.cursor);
    expect(tail.frames.map((f) => f.seq)).toEqual([2]);
  });

  it('request_id trùng + cùng input → cùng run, không gọi model lần hai; khác input → 409', async () => {
    const rid = `req-${uuidv7()}`;
    const a = await turn([{ text: 'một' }], { text: 'hỏi A', requestId: rid });
    const before = calls;
    const b = await turn([{ text: 'hai' }], { text: 'hỏi A', requestId: rid });
    expect(b.run_id).toBe(a.run_id);
    expect(b.session_id).toBe(a.session_id);
    expect(calls).toBe(before);
    expect(b.events).toEqual([{ type: 'delta', text: 'một' }]);
    const db = await tenant();
    expect(await db.assistantMessage.count({ where: { sessionId: a.session_id } })).toBe(2);
    await expect(turn([{ text: 'x' }], { text: 'hỏi B', requestId: rid })).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('người khác biết run_id → 404; cursor của người khác → 403', async () => {
    const r = await turn([{ text: 'riêng tư' }], { text: 'của tôi', requestId: `req-${uuidv7()}` });
    expect((await sse(r.run_id!, other.token)).status).toBe(404);
    const mine = await sse(r.run_id!, await tokenOf(h.user));
    const signer = h.app.get(AssistantService, { strict: false }).cursors();
    const foreign = signer.sign(r.run_id!, other.id, 1);
    expect((await sse(r.run_id!, await tokenOf(h.user), foreign)).status).toBe(403);
    expect(mine.frames.length).toBeGreaterThan(0);
  });

  it('migration genui_stream: bảng + unique + EXPLAIN replay / phiên dùng index', async () => {
    const db = await tenant();
    const idx = (await db.$queryRaw<{ indexname: string }[]>`SELECT indexname FROM pg_indexes WHERE tablename IN ('assistant_request','assistant_event','assistant_receipt','assistant_session','assistant_message')`).map((r) => r.indexname);
    expect(idx).toEqual(expect.arrayContaining(['assistant_request_user_id_request_id_key', 'assistant_request_recovery_idx', 'assistant_event_run_id_seq_key', 'assistant_receipt_run_id_node_attempt_key', 'assistant_session_user_recent_idx', 'assistant_message_session_keyset_idx']));
    const c = new pg.Client({ connectionString: env.TENANT_DATABASE_URL!.replace(/\/[^/?]*(\?|$)/, `/${(await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } })).dbName}$1`) });
    await c.connect();
    try {
      await c.query('SET enable_seqscan = off');
      const q = (sql: string) => c.query(`EXPLAIN ${sql}`).then((r) => r.rows.map((x) => x['QUERY PLAN']).join('\n'));
      expect(await q(`SELECT id FROM assistant_event WHERE run_id = '${uuidv7()}' AND seq > 3 ORDER BY seq LIMIT 200`)).toMatch(/assistant_event_run_id_seq_key/);
      expect(await q(`SELECT id, title, mode FROM assistant_session WHERE user_id = '${h.user}' AND archived_at IS NULL ORDER BY last_message_at DESC, id DESC LIMIT 30`)).toMatch(/assistant_session_user_recent_idx/);
      expect(await q(`SELECT id FROM assistant_message WHERE session_id = '${uuidv7()}' ORDER BY created_at, id LIMIT 50`)).toMatch(/assistant_message_session_(keyset|id_created_at)_idx/);
      expect(await q(`SELECT id FROM assistant_request WHERE execution_state = 'running' AND lease_until < now() ORDER BY lease_until, id LIMIT 50`)).toMatch(/assistant_request_recovery_idx/);
    } finally {
      await c.end();
    }
  });
});

const tokenOf = async (userId: string) => h.tokenFor(userId);
