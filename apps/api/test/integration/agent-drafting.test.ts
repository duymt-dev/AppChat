// TIP-021b (AC1, AC4–AC6) trên API thật (Postgres + ActionExecutor + AI_ENGINE=mock): discovery trước sinh, sinh theo schema không tool,
// binding `agent_draft_publication` bền; gửi lại cùng request_id không chạy model lần hai; mô tả khác cùng request_id → 409; run soạn
// không lộ chữ thô qua GET /runs/:id; bản soạn không ghi agent; xuất bản vẫn qua agent.create_and_publish (kiểm quyền hiện hành).
// EXPLAIN 100k binding: khoá lần soạn seek bằng (actor_id, request_key_hash); khôi phục dùng index partial (phase, updated_at, id).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WalletService, uuidv7 } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  await h.app.get(WalletService, { strict: false }).topup(h.ws, 1000, { refType: 'test', refId: uuidv7() });
  const team = await h.platform.plan.findUniqueOrThrow({ where: { key: 'team' } });
  await h.platform.subscription.create({ data: { id: uuidv7(), workspaceId: h.ws, planId: team.id, status: 'active', currentPeriodStart: h.clock.now() } });
}, 180_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown, headers: Record<string, string> = {}, token?: string) => call(h, `/actions/${id}`, { input }, { ...headers, ...(token ? { authorization: `Bearer ${token}` } : {}) }).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const DESC = 'Agent CSKH cho spa: tạo ticket khiếu nại, đặt lịch hẹn qua Zalo';

describe('agent.draft_from_description — đường ống TIP-021b', () => {
  it('model (giả) trả đúng khuôn → mode model, tool ⊆ ứng viên được phép, binding published, không tạo agent', async () => {
    const db = await tenant();
    const agents0 = await db.aiAgent.count();
    const rid = uuidv7();
    const r = await act('agent.draft_from_description', { description: DESC, request_id: rid });
    expect(r.status).toBe(200);
    const out = r.body.data.result;
    expect(out.generation_info).toMatchObject({ schema_version: 1, mode: 'model', warnings: expect.any(Array) });
    expect(out.generation_info.fallback_reason).toBeUndefined();
    expect(out.draft.channels).toEqual(['zalo_personal']);
    const b = await db.agentDraftPublication.findUniqueOrThrow({ where: { id: out.generation_info.operation_id } });
    expect(b).toMatchObject({ phase: 'published', protectedResult: null });
    const ids = (b.candidates as { id: string }[]).map((c) => c.id);
    for (const t of out.draft.tools) expect(ids).toContain(t);
    expect(await db.aiAgent.count()).toBe(agents0);
    // Run soạn: completed, output không chứa chữ model; GET /runs/:id không trả result_text.
    const run = await db.aiRun.findUniqueOrThrow({ where: { id: b.runId! } });
    expect(run.status).toBe('completed');
    expect(JSON.stringify(run.output)).not.toContain(out.draft.name);
    expect(JSON.stringify(run.input)).not.toContain('spa');
    const detail = await call(h, `/runs/${run.id}`).then(json);
    expect(detail.status).toBe(200);
    expect(detail.body.data.result_text).toBeNull();
  });

  it('gửi lại cùng request_id → cùng operation, không run mới; mô tả khác cùng request_id → 409', async () => {
    const db = await tenant();
    const rid = uuidv7();
    const a = (await act('agent.draft_from_description', { description: DESC, request_id: rid })).body.data.result;
    const runs = await db.aiRun.count({ where: { title: 'agent.draft_from_description' } });
    const b = (await act('agent.draft_from_description', { description: DESC, request_id: rid })).body.data.result;
    expect(b.generation_info.operation_id).toBe(a.generation_info.operation_id);
    expect(await db.aiRun.count({ where: { title: 'agent.draft_from_description' } })).toBe(runs);
    const c = await act('agent.draft_from_description', { description: 'Agent bán hàng khác hẳn', request_id: rid });
    expect(c.status).toBe(409);
    expect(c.body.error.fields).toMatchObject({ request_id: 'description_changed' });
  });

  it('thiếu request_id → 422; Sales (không agents.manage) → 403', async () => {
    expect((await act('agent.draft_from_description', { description: DESC })).status).toBe(422);
    const sales = await h.member('sales');
    expect((await act('agent.draft_from_description', { description: DESC, request_id: uuidv7() }, {}, sales.token)).status).toBe(403);
  });

  it('xuất bản bản soạn qua agent.create_and_publish (đường xác nhận chuẩn) — tool kiểm lại theo quyền hiện hành', async () => {
    const out = (await act('agent.draft_from_description', { description: DESC, request_id: uuidv7() })).body.data.result;
    const pub = await act('agent.create_and_publish', out.draft, { 'idempotency-key': uuidv7() });
    expect([200, 202]).toContain(pub.status);
    // Builder thủ công vẫn chọn được tool đã có quyền dù không nằm trong ứng viên (ứng viên không phải hạn chế mới).
    const manual = await act('agent.create', { name: 'Thủ công', tools: ['contact.update'] }, { 'idempotency-key': uuidv7() });
    expect(manual.status).toBe(200);
  });

  it('EXPLAIN 100k binding: khoá lần soạn = Index Scan unique; khôi phục = index partial', async () => {
    const db = await tenant();
    await db.$executeRawUnsafe(`
      INSERT INTO agent_draft_publication (id, actor_id, request_key_hash, input_digest, schema_version, candidate_fingerprint, candidates, discovery, phase, lease_until, updated_at)
      SELECT gen_random_uuid(), 'user:' || (g % 50), md5(g::text), md5('d'), 1, 'f', '[]'::jsonb, '{}'::jsonb,
             (CASE WHEN g % 100 = 0 THEN 'awaiting_validation' ELSE 'published' END)::agent_draft_phase, now(), now() - (g || ' seconds')::interval
        FROM generate_series(1, 100000) g`);
    await db.$executeRawUnsafe('ANALYZE agent_draft_publication');
    const plan = async (sql: string) => (await db.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(`EXPLAIN ${sql}`)).map((r) => r['QUERY PLAN']).join('\n');
    const key = await plan(`SELECT id, phase, input_digest FROM agent_draft_publication WHERE actor_id = 'user:7' AND request_key_hash = md5('7')`);
    expect(key).toMatch(/agent_draft_publication_request_key/);
    expect(key).not.toMatch(/Seq Scan/);
    const rec = await plan(`SELECT id FROM agent_draft_publication WHERE phase IN ('awaiting_generation','awaiting_validation') AND updated_at < now() ORDER BY updated_at, id LIMIT 100`);
    expect(rec).toMatch(/agent_draft_publication_recovery_idx/);
    expect(rec).not.toMatch(/Seq Scan/);
    await db.$executeRawUnsafe(`DELETE FROM agent_draft_publication WHERE candidate_fingerprint = 'f'`);
  }, 120_000);
});
