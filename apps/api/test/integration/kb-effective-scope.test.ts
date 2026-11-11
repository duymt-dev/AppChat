// TIP-020c trên Postgres 16 + Memurai thật: phạm vi tri thức hiệu lực qua action `kb.search` + lượt agent thật.
//   AC1 agent phạm vi rỗng → 0 đoạn, không embed / trừ credit; Trợ lý thường thấy nguồn người hỏi đọc được.
//   AC2 ma trận thư mục / thẻ: (nhận: thư mục HOẶC thẻ) ∧ (hiện hành: thư mục HOẶC thẻ) — nguồn khớp thư mục ở bên này, thẻ ở bên kia vẫn ra.
//   AC4 run giả mạo / thiếu binding (run cũ) → scope_unavailable; HTTP không đặt được run / phạm vi.
//   AC5 kb.manage-only không đọc nguồn internal gắn sản phẩm; nguồn hội thoại của khách đã "Quên" không ra; kênh chỉ public.
//   AC6 nạp lại / chuyển thư mục sau truy hồi → nháp AI ẩn ở danh sách, gửi kèm `ai_draft_ref` → 409; nháp tay vẫn gửi.
//   AC7 EXPLAIN 100k đoạn + nhóm được phép thưa: ứng viên trước LIMIT không đọc payload; index phạm vi mới có mặt.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import pg from 'pg';
import { ActionExecutor, AiJobsModule, CLOCK, KernelModule, LOGGER, WalletService, agentAuthz, agentKnowledge, assistantKnowledge, createLogger, recordRefs, uuidv7, writeAiDraft } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { authzForRole, conversationSchema } from '@appchat/shared';
import { call, env, startApi, type Harness } from './setup';
import { until } from './worker.harness';

let h: Harness;
let ai: TestingModule;
let resolver: TenantDbResolver;
const log = createLogger({ level: 'silent' });

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (u: { token: string }) => ({ authorization: `Bearer ${u.token}` });
const act = (id: string, input: unknown, who?: { token: string }) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...(who ? as(who) : {}) }).then(json);
const get = (path: string, who?: { token: string }) => call(h, path, undefined, who ? as(who) : {}).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));

const ids = { aPlain: '', aVip: '', bVip: '', loose: '', internal: '' };
let fA = '';
let fB = '';

async function source(name: string, text: string, o: { folder_id?: string; tags?: string[]; visibility?: 'public' | 'internal' } = {}) {
  const r = await act('kb.add_source', { name, text, visibility: 'public', ...o });
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return r.body.data.result.source_id as string;
}
const ready = async () => until(async () => (await (await tenant()).kbSource.count({ where: { status: { in: ['pending', 'processing'] }, deletedAt: null } })) === 0, 30_000);

/** Run agent có binding (như runtime tạo lúc tạo run) — `kb.search` chạy bằng executor thật với `runId` (HTTP không đặt được run). */
async function agentRun(agentId: string, version: number, scope: { folder_ids: string[]; tags: string[] }, o: { channel?: boolean; commanderId?: string } = {}) {
  const db = await tenant();
  const id = uuidv7();
  await db.aiRun.create({ data: { id, kind: o.commanderId ? 'delegate' : 'agent_reply', rootRunId: id, agentId, agentVersion: version, status: 'running', initiatedByUserId: o.commanderId ?? null, knowledge: agentKnowledge({ agentId, version, cfg: { kb_scope: scope } }, o.commanderId ? { commanderId: o.commanderId } : { channel: true }) as object } });
  return id;
}

/** `kb.search` trong run (đúng đường runtime: ActionContext.runId + nguồn agent). */
async function searchIn(runId: string, query: string, o: { agentId: string; commander?: string }) {
  const ex = h.app.get(ActionExecutor, { strict: false });
  const authz = agentAuthz({ id: o.agentId, toolIds: ['kb.search'] }, o.commander ? authzForRole('owner', o.commander) : undefined);
  const r = await ex.execute({ workspaceId: h.ws, source: 'agent', actor: { type: 'agent', id: o.agentId }, ...(o.commander ? { onBehalfOfUserId: o.commander, knowledgeAuthz: authzForRole('owner', o.commander) } : {}), runId, stepId: '0', authz }, 'kb.search', { query });
  expect(r.status, JSON.stringify(r.data)).toBe(200);
  return (r.data as { result: { grounded: boolean; chunks: { source_id: string }[] } }).result;
}
const sourcesOf = (r: { chunks: { source_id: string }[] }) => new Set(r.chunks.map((c) => c.source_id));

async function agent(name: string, scope: { folder_ids: string[]; tags: string[] }) {
  const r = await act('agent.create_and_publish', { name, role: 'cs', tools: ['kb.search'], threshold: 70, kb_scope: scope });
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return { id: r.body.data.result.agent_id as string, version: 1 };
}

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  ai = await Test.createTestingModule({ imports: [KernelModule.forRoot({ ...env, LOG_LEVEL: 'silent' }), AiJobsModule] }).overrideProvider(LOGGER).useValue(log).overrideProvider(CLOCK).useValue(h.clock).compile();
  await ai.init();
  await h.app.get(WalletService, { strict: false }).topup(h.ws, 2000, { refType: 'test', refId: uuidv7() });
  const plan = await h.platform.plan.create({ data: { id: uuidv7(), key: `t-unl-${uuidv7().slice(-8)}`, segment: 'business', name: 'Test', maxAgents: null, maxChannels: null, active: false } });
  await h.platform.subscription.create({ data: { id: uuidv7(), workspaceId: h.ws, planId: plan.id, status: 'active', currentPeriodStart: h.clock.now() } });
  fA = (await act('kb.folder.create', { name: 'Chính sách' })).body.data.result.folder_id;
  fB = (await act('kb.folder.create', { name: 'Quy trình' })).body.data.result.folder_id;
  // Ma trận nguồn: thư mục A / B × thẻ VIP / không; một nguồn internal; một nguồn ngoài mọi phạm vi.
  ids.aPlain = await source('A thường', 'Chính sách đổi trả liệu trình trong bảy ngày tại spa Hoa Mai.', { folder_id: fA });
  ids.aVip = await source('A VIP', 'Chính sách đổi trả cho khách VIP được kéo dài ba mươi ngày tại spa Hoa Mai.', { folder_id: fA, tags: ['VIP'] });
  ids.bVip = await source('B VIP', 'Quy trình đổi trả VIP: lễ tân xác nhận hạng thẻ trước khi đổi liệu trình tại spa Hoa Mai.', { folder_id: fB, tags: ['VIP'] });
  ids.loose = await source('Rời', 'Chính sách đổi trả quà tặng không áp dụng hoàn tiền tại spa Hoa Mai.');
  ids.internal = await source('Nội bộ', 'Chính sách đổi trả nội bộ: quản lý ca duyệt hoàn tiền tại spa Hoa Mai.', { folder_id: fA, visibility: 'internal' });
  expect(await ready()).toBe(true);
}, 240_000);
afterAll(async () => {
  await ai?.close();
  await resolver?.close();
  await h?.close();
});

const Q = 'chính sách đổi trả spa Hoa Mai';

describe('AC1 / AC4 — phạm vi rỗng ≠ Trợ lý; binding thiếu / giả', () => {
  it('Trợ lý (Owner, gọi trực tiếp) thấy cả internal; agent phạm vi rỗng → 0 đoạn, không run embed, không trừ credit', async () => {
    const all = await act('kb.search', { query: Q });
    expect(all.status).toBe(200);
    expect(sourcesOf(all.body.data.result)).toContain(ids.internal);
    const empty = await agent('Rỗng', { folder_ids: [], tags: [] });
    const run = await agentRun(empty.id, empty.version, { folder_ids: [], tags: [] });
    const wallet = h.app.get(WalletService, { strict: false });
    const before = (await wallet.balance(h.ws)).total;
    const db = await tenant();
    const runsBefore = await db.aiRun.count();
    const r = await searchIn(run, Q, { agentId: empty.id });
    expect(r).toEqual({ grounded: false, chunks: [], citations: [] });
    expect(await db.aiRun.count()).toBe(runsBefore);
    expect((await wallet.balance(h.ws)).total).toBe(before);
  });

  it('run agent thiếu binding (run cũ) → không truy hồi; Trợ lý cũ của người KHÁC → không truy hồi', async () => {
    const a = await agent('Cũ', { folder_ids: [fA], tags: [] });
    const db = await tenant();
    const legacy = uuidv7();
    await db.aiRun.create({ data: { id: legacy, kind: 'agent_reply', rootRunId: legacy, agentId: a.id, agentVersion: 1, status: 'running' } });
    expect((await searchIn(legacy, Q, { agentId: a.id })).chunks).toEqual([]);
    const foreign = uuidv7();
    await db.aiRun.create({ data: { id: foreign, kind: 'assistant', rootRunId: foreign, status: 'running', knowledge: assistantKnowledge(uuidv7()) as object } });
    expect((await searchIn(foreign, Q, { agentId: a.id, commander: h.user })).chunks).toEqual([]);
  });

  it('HTTP kb.search: phạm vi / run / actor client gửi kèm bị bỏ (schema công khai chỉ query / limit) — Sales không có nhóm internal nào ngoài phạm vi của mình', async () => {
    const forged = await act('kb.search', { query: Q, folder_ids: [fB], run_id: uuidv7(), visibility: ['internal'] });
    expect(forged.status).toBe(200);
    const plain = await act('kb.search', { query: Q });
    expect([...sourcesOf(forged.body.data.result)].sort()).toEqual([...sourcesOf(plain.body.data.result)].sort());
  });
});

describe('AC2 — ma trận thư mục / thẻ (nhận ∧ hiện hành, mỗi bên OR)', () => {
  it('kênh: phạm vi thư mục A → nguồn public của A; không internal, không nguồn rời', async () => {
    const a = await agent('Kênh A', { folder_ids: [fA], tags: [] });
    const got = sourcesOf(await searchIn(await agentRun(a.id, 1, { folder_ids: [fA], tags: [] }), Q, { agentId: a.id }));
    expect(got.has(ids.aPlain) || got.has(ids.aVip)).toBe(true);
    for (const x of [ids.internal, ids.loose, ids.bVip]) expect(got.has(x)).toBe(false);
  });

  it('nhận = thư mục A, hiện hành = thẻ VIP (đã đổi sau khi nhận) → chỉ A∧VIP — không giao mảng (không mục chung vẫn ra)', async () => {
    const a = await agent('Đổi phạm vi', { folder_ids: [], tags: ['VIP'] });
    const run = await agentRun(a.id, 1, { folder_ids: [fA], tags: [] });
    const got = sourcesOf(await searchIn(run, Q, { agentId: a.id }));
    expect(got.has(ids.aVip)).toBe(true);
    for (const x of [ids.aPlain, ids.bVip, ids.loose, ids.internal]) expect(got.has(x)).toBe(false);
  });

  it('agent tạm dừng sau khi nhận run → 0 đoạn (thu hồi có hiệu lực ngay lần gọi kế)', async () => {
    const a = await agent('Tạm dừng', { folder_ids: [fA], tags: [] });
    const run = await agentRun(a.id, 1, { folder_ids: [fA], tags: [] });
    await (await tenant()).aiAgent.update({ where: { id: a.id }, data: { status: 'paused' } });
    expect((await searchIn(run, Q, { agentId: a.id })).chunks).toEqual([]);
  });

  it('làm cho người (delegate): phạm vi ∧ quyền người ra lệnh → internal trong phạm vi ra được với Owner', async () => {
    const a = await agent('Giao việc', { folder_ids: [fA], tags: [] });
    const got = sourcesOf(await searchIn(await agentRun(a.id, 1, { folder_ids: [fA], tags: [] }, { commanderId: h.user }), Q, { agentId: a.id, commander: h.user }));
    expect(got.has(ids.internal)).toBe(true);
    expect(got.has(ids.loose)).toBe(false);
  });
});

describe('AC5 — quyền nguồn theo module gốc', () => {
  it('chỉ kb.manage: thấy tài liệu internal thường, KHÔNG thấy internal gắn sản phẩm; catalog.view thì thấy', async () => {
    const p = (await act('product.create', { name: 'Gói Hoa Mai nội bộ', type: 'service', price: '100000', status: 'active' })).body.data.result.product_id;
    const db = await tenant();
    // Nguồn catalog internal gắn sản phẩm (đúng khuôn catalog-sync) — đoạn sẵn (nhánh từ khoá), không cần worker nạp.
    const pid = uuidv7();
    await db.kbSource.create({ data: { id: pid, origin: 'catalog', kind: 'product', name: 'Gói Hoa Mai nội bộ', productId: p, body: 'x', visibility: 'internal', status: 'ready', chunkCount: 1 } });
    await db.kbChunk.create({ data: { id: uuidv7(), sourceId: pid, ord: 0, content: 'Chính sách đổi trả gói Hoa Mai nội bộ: chỉ quản lý duyệt.', embedModel: 'none' } });
    const kbOnly = await h.member((await act('role.create', { name: 'Chỉ kho', permissions: ['assistant.use', 'kb.manage'], data_scope: { inbox: 'none', crm: 'none', sales: 'none', booking: 'none', support: 'none', insights: 'none' } })).body.data.result.key);
    const r = await act('kb.search', { query: 'chính sách đổi trả gói Hoa Mai nội bộ' }, kbOnly);
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const got = sourcesOf(r.body.data.result);
    expect(got.has(pid)).toBe(false);
    const cat = await h.member((await act('role.create', { name: 'Xem sản phẩm', permissions: ['assistant.use', 'catalog.view'], data_scope: { inbox: 'none', crm: 'none', sales: 'none', booking: 'none', support: 'none', insights: 'none' } })).body.data.result.key);
    expect(sourcesOf((await act('kb.search', { query: 'chính sách đổi trả gói Hoa Mai nội bộ' }, cat)).body.data.result).has(pid)).toBe(true);
    // Sản phẩm xoá → nguồn gắn không còn ra cho ai.
    expect((await act('product.archive', { product_id: p })).status).toBe(200);
    expect(sourcesOf((await act('kb.search', { query: 'chính sách đổi trả gói Hoa Mai nội bộ' })).body.data.result).has(pid)).toBe(false);
  });
});

describe('AC6 — nháp AI phụ thuộc nguồn', () => {
  it('nạp lại nguồn sau khi soạn → danh sách ẩn nháp, gửi kèm ref → 409; nháp tay vẫn gửi; ref của hội thoại khác → 409', async () => {
    const db = await tenant();
    await act('webchat.update_widget', { enabled: true, name: 'Web Scope' });
    const acc = (await db.channelAccount.findFirstOrThrow({ where: { type: 'webchat' } })).id;
    const a = await agent('Soạn nháp', { folder_ids: [fA], tags: [] });
    const run = await agentRun(a.id, 1, { folder_ids: [fA], tags: [] });
    const src = await db.kbSource.findUniqueOrThrow({ where: { id: ids.aPlain }, select: { ingestSeq: true } });
    await recordRefs(db, run, [{ s: ids.aPlain, g: src.ingestSeq, b: run }]);
    const mk = async () => {
      const id = uuidv7();
      await db.conversation.create({ data: { id, channelAccountId: acc, channelType: 'webchat', externalThreadId: `t-${id}`, aiMode: 'copilot', lastMessageAt: h.clock.now() } });
      await db.message.create({ data: { id: uuidv7(), conversationId: id, channelAccountId: acc, direction: 'in', senderType: 'contact', senderId: 'v', kind: 'text', body: 'Đổi trả thế nào?', externalMsgId: uuidv7(), status: 'delivered', createdAt: h.clock.now() } });
      return id;
    };
    const c1 = await mk();
    const c2 = await mk();
    await writeAiDraft(db, c1, 'Dạ spa đổi trong 7 ngày ạ.', run);
    const row = async (id: string) => conversationSchema.parse((await get(`/conversations/${id}`)).body.data);
    const ref = (await row(c1)).ai_draft_ref!;
    expect(ref).toMatchObject({ id: run });
    // Ref của c1 dùng ở c2 → 409.
    expect((await act('message.send', { conversation_id: c2, text: 'x', ai_draft_ref: ref })).status).toBe(409);
    // Nạp lại nguồn (thế hệ đổi) → nháp ẩn + gửi kèm ref → 409 knowledge_revoked.
    expect((await act('kb.refresh_source', { source_id: ids.aPlain })).status).toBe(200);
    const after = await row(c1);
    expect(after.ai_draft).toBeUndefined();
    const stale = await act('message.send', { conversation_id: c1, text: 'Dạ spa đổi trong 7 ngày ạ.', ai_draft_ref: ref });
    expect(stale.status).toBe(409);
    expect(stale.body.error.fields).toEqual({ ai_draft: 'knowledge_revoked' });
    // Tin tay (không ref) vẫn gửi theo luật cũ — không dò chuỗi.
    expect((await act('message.send', { conversation_id: c1, text: 'Dạ spa đổi trong 7 ngày ạ.' })).status).toBe(200);
    expect(await ready()).toBe(true);
  });
});

describe('AC7 — EXPLAIN 100k đoạn, nhóm được phép thưa', () => {
  it('index phạm vi có mặt; ứng viên chọn id trước LIMIT, payload chỉ cho top-N; kết quả đúng nhóm được phép', async () => {
    const db = await tenant();
    const idx = (await db.$queryRaw<{ indexname: string }[]>`SELECT indexname FROM pg_indexes WHERE tablename = 'kb_source'`).map((r) => r.indexname);
    expect(idx).toEqual(expect.arrayContaining(['kb_source_scope_ready_idx', 'kb_source_tags_ready_gin_idx']));
    const c = new pg.Client({ connectionString: env.TENANT_DATABASE_URL!.replace(/\/[^/?]*(\?|$)/, `/${(await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } })).dbName}$1`) });
    await c.connect();
    try {
      // 1.000 nguồn × 100 đoạn = 100k đoạn ngoài phạm vi (thư mục riêng), 1 nguồn thưa trong phạm vi.
      const noise = uuidv7();
      await c.query(`INSERT INTO kb_folder (id, name) VALUES ($1, 'Nhiễu 100k')`, [noise]);
      await c.query(`INSERT INTO kb_source (id, folder_id, origin, kind, name, status) SELECT gen_random_uuid(), $1, 'text', 'text', 'n' || g, 'ready' FROM generate_series(1, 1000) g`, [noise]);
      await c.query(`INSERT INTO kb_chunk (id, source_id, ord, content, embed_model) SELECT gen_random_uuid(), s.id, g, 'đoạn nhiễu chính sách đổi trả số ' || g, 'none' FROM kb_source s, generate_series(1, 100) g WHERE s.folder_id = $1`, [noise]);
      await c.query('ANALYZE kb_source; ANALYZE kb_chunk');
      expect(Number((await c.query('SELECT count(*) AS n FROM kb_chunk')).rows[0].n)).toBeGreaterThanOrEqual(100_000);
      const plan = (await c.query(`EXPLAIN (ANALYZE, BUFFERS) SELECT c.id FROM kb_chunk c JOIN kb_source s ON s.id = c.source_id
        WHERE s.deleted_at IS NULL AND s.status = 'ready' AND s.visibility = 'public' AND s.folder_id = ANY($1::uuid[])
          AND f_unaccent(lower('chinh sach doi tra')) <% c.content_norm ORDER BY c.id LIMIT 20`, [[fA]])).rows.map((x) => x['QUERY PLAN']).join('\n');
      // Lọc nguồn theo phạm vi bằng index (không quét toàn bảng nguồn) — nhóm được phép thưa; payload (content) không đọc ở bước ứng viên.
      expect(plan).toMatch(/kb_source_scope_ready_idx|kb_source_folder_status_idx/);
      expect(plan).not.toMatch(/Seq Scan on kb_source/);
      const a = await agent('EXPLAIN', { folder_ids: [fA], tags: [] });
      const got = sourcesOf(await searchIn(await agentRun(a.id, 1, { folder_ids: [fA], tags: [] }), 'chính sách đổi trả', { agentId: a.id }));
      expect([...got].every((s) => [ids.aPlain, ids.aVip].includes(s))).toBe(true);
      await c.query('DELETE FROM kb_source WHERE folder_id = $1', [noise]);
      await c.query('DELETE FROM kb_folder WHERE id = $1', [noise]);
    } finally {
      await c.end();
    }
  });
});
