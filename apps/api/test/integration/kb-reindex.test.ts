// TIP-020e AC2–AC5 (+ AC1 trên DB thật), Postgres 16 + pgvector native: đổi route embed → chỉ `index_state=stale` + outbox, 0 lời gọi embed,
// 0 trừ Credit; `kb.reindex` xem trước BẮT BUỘC (đoạn / token / Credit theo giá model đích / dung lượng) → xác nhận → generation `building`
// ở khe B; job 3 lô (150 đoạn), "kill" ở lô 2 → chạy lại tiếp từ cursor (không embed lại lô 1); Credit = ceil gộp cả generation (DC-251);
// publish đổi khe (CAS — lease cũ không đổi lần hai); chunk id giữ nguyên, trích dẫn đọc lại đúng đoạn. Race: nguồn xoá / nạp lại giữa
// đọc lô và ghi → không ghi; nguồn mới trong lúc building → catch-up bù; A→B→C → superseded. Reindex lần 2 (B → A). Huỷ dọn khe đích.
// EXPLAIN 100k đoạn: đếm / catch-up theo generation dùng index (generation, id); truy vấn khe B dùng HNSW khe B.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { AiSdkEmbedder, mockEmbeddingModel, type Embedder, type ModelCandidate, type ModelSource } from '@appchat/ai';
import { CreditMeter, KB_EMBEDDER, KB_REINDEX_LEASE_MS, WalletService, claimLease, openGeneration, publishGeneration, purgeGeneration, runGeneration, searchKb, uuidv7 } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, type TenantDb } from '@appchat/db';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let calls = 0;
/** Route embed hiện hành của "router" giả — đổi phần tử đầu là đổi route (thế hệ route khác → space khác). */
let route: ModelCandidate[] = [];
const cand = (provider: string, rev: string): ModelCandidate => ({ provider, model: 'mock-embed', routeRevision: rev, configRevision: `p:${rev}`, handle: mockEmbeddingModel(provider, { tokensPerCall: 1000, onCall: () => void calls++ }) });
const PX = 'mock-x';
const PY = 'mock-y';
const X = cand(PX, 'route-x');
const Y = cand(PY, 'route-y');
const SPACE_X = `${PX}:mock-embed:1536:route-x`;
const SPACE_Y = `${PY}:mock-embed:1536:route-y`;
const source: ModelSource = { candidates: async () => route };
const QUERY = 'bảo hành máy lọc nước';

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown, extra: Record<string, unknown> = {}, headers: Record<string, string> = {}) => call(h, `/actions/${id}`, { input, ...extra }, { 'idempotency-key': uuidv7(), ...headers }).then(json);
const get = (path: string) => call(h, path).then(json);
const tenant = (): Promise<TenantDb> => resolver.get(TenantContexts.system(h.ws, 't'));
const embedder = () => h.app.get(KB_EMBEDDER, { strict: false }) as AiSdkEmbedder;
const owner = { principal: { kind: 'public' as const }, admitted: null, current: null } as never;
const usageKb = () => h.platform.creditLedger.findMany({ where: { workspaceId: h.ws, source: 'kb', kind: 'usage' }, select: { delta: true, refId: true } });
const deps = (e: Embedder = embedder()) => ({ embedder: e, meter: h.app.get(CreditMeter, { strict: false }), now: () => h.clock.now() });
const VEC = `[${Array.from({ length: 1536 }, (_, i) => (i === 0 ? '1' : '0')).join(',')}]`;
const ids = async (db: TenantDb, sourceId: string) => (await db.kbChunk.findMany({ where: { sourceId }, orderBy: { id: 'asc' }, select: { id: true } })).map((c) => c.id);

/** Nguồn ready + N đoạn đã có vector khe A ở space X (như kho đã nạp trước khi đổi model). */
async function seedSource(n: number, text = 'chính sách bảo hành máy lọc nước') {
  const db = await tenant();
  const id = uuidv7();
  await db.kbSource.create({ data: { id, origin: 'text', kind: 'text', name: `Nguồn ${id.slice(-4)}`, body: text, status: 'ready', chunkCount: n } });
  const s = await db.kbSetting.findUniqueOrThrow({ where: { id: 1 } });
  const slot = s.activeSlot === 'b' ? 'b' : 'a';
  for (let i = 0; i < n; i++) {
    const cid = uuidv7();
    if (slot === 'a')
      await db.$executeRaw`INSERT INTO kb_chunk (id, source_id, ord, content, embedding, embed_model, embed_space_a, embed_generation_a, token_count)
        VALUES (${cid}::uuid, ${id}::uuid, ${i}, ${`${text} đoạn ${i}`}, ${VEC}::vector, 'mock', ${s.activeSpace}, ${s.activeGenerationId}::uuid, 10)`;
    else
      await db.$executeRaw`INSERT INTO kb_chunk (id, source_id, ord, content, embedding_b, embed_model, embed_space_b, embed_generation_b, token_count)
        VALUES (${cid}::uuid, ${id}::uuid, ${i}, ${`${text} đoạn ${i}`}, ${VEC}::vector, 'mock', ${s.activeSpace}, ${s.activeGenerationId}::uuid, 10)`;
  }
  return id;
}

/** Xem trước bắt buộc (UI) → xác nhận bằng token. */
async function reindex() {
  const first = await act('kb.reindex', {});
  expect([first.status, first.body.data?.status], JSON.stringify(first.body)).toEqual([202, 'preview_required']);
  const done = await act('kb.reindex', {}, { confirm_token: first.body.data.confirm_token });
  expect(done.status, JSON.stringify(done.body)).toBe(200);
  return { preview: first.body.data.preview, result: done.body.data.result as { generation_id: string; expected: number; reused: boolean } };
}

let src1 = '';
let chunkIds: string[] = [];
let gen = '';

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  // Router giả hai route dưới ĐÚNG embedder singleton mà handler / controller / tìm kiếm dùng.
  Object.assign(embedder(), { models: source });
  route = [X];
  for (const p of [PX, PY]) await h.platform.modelPrice.upsert({ where: { providerKey_model: { providerKey: p, model: 'mock-embed' } }, create: { providerKey: p, model: 'mock-embed', tier: 'standard', creditsPer1kIn: 0.4, creditsPer1kOut: 0 }, update: {} });
  const db = await tenant();
  await db.kbSetting.update({ where: { id: 1 }, data: { activeSpace: SPACE_X } });
  src1 = await seedSource(150);
  chunkIds = await ids(db, src1);
  await h.app.get(WalletService, { strict: false }).topup(h.ws, 1000, { refType: 'test', refId: uuidv7() });
}, 180_000);

afterAll(async () => {
  await h?.platform.modelPrice.deleteMany({ where: { providerKey: { in: [PX, PY] } } });
  await resolver?.close();
  await h?.close();
});

describe('schema 020e', () => {
  it('khe B + bảng generation + HNSW khe B + một generation dở (partial unique) + index đếm theo generation; generation khởi tạo', async () => {
    const db = await tenant();
    const idx = (await db.$queryRaw<{ indexname: string }[]>`SELECT indexname FROM pg_indexes WHERE tablename IN ('kb_chunk','kb_embed_generation')`).map((r) => r.indexname);
    expect(idx).toEqual(expect.arrayContaining(['kb_chunk_embedding_b_hnsw_idx', 'kb_chunk_embed_generation_a_idx', 'kb_chunk_embed_generation_b_idx', 'kb_embed_generation_open_key']));
    const s = await db.kbSetting.findUniqueOrThrow({ where: { id: 1 } });
    expect(s).toMatchObject({ activeSlot: 'a', indexState: 'current' });
    expect(await db.kbEmbedGeneration.findUniqueOrThrow({ where: { id: s.activeGenerationId! } })).toMatchObject({ phase: 'active', reason: 'initial', slot: 'a' });
  });
});

describe('đổi route → chỉ đánh dấu cũ', () => {
  it('AC2 route X: current; đổi sang Y → stale + đúng một outbox kb.index_stale, 0 lời gọi embed, 0 trừ Credit, không generation', async () => {
    expect((await get('/settings/kb')).body.data.index).toMatchObject({ state: 'current', active_space_label: `${PX} · mock-embed`, phase: null, degraded: null });
    const before = (await usageKb()).length;
    route = [Y, X];
    calls = 0;
    const r = await get('/settings/kb');
    expect(r.body.data.index).toMatchObject({ state: 'stale', active_space_label: `${PX} · mock-embed`, target_space_label: `${PY} · mock-embed`, degraded: null });
    await get('/settings/kb');
    const db = await tenant();
    expect(await db.outboxEvent.count({ where: { topic: 'kb.index_stale' } })).toBe(1);
    expect(await openGeneration(db)).toBeNull();
    expect(calls).toBe(0);
    expect((await usageKb()).length).toBe(before);
    // Route quay lại X → hết cũ (không tạo lại, không Credit); đổi sang Y lần nữa → cũ + outbox mới.
    route = [X];
    expect((await get('/settings/kb')).body.data.index).toMatchObject({ state: 'current', target_space_label: null });
    route = [Y, X];
    expect((await get('/settings/kb')).body.data.index).toMatchObject({ state: 'stale', target_space_label: `${PY} · mock-embed` });
    expect(await db.outboxEvent.count({ where: { topic: 'kb.index_stale' } })).toBe(2);
    expect([calls, (await usageKb()).length]).toEqual([0, before]);
  });

  it('AC1 trong lúc cũ: câu hỏi embed GHIM space X (route X còn) → nhánh vector khe A chạy, không suy giảm', async () => {
    calls = 0;
    const r = await searchKb(await tenant(), embedder(), { query: QUERY, restriction: owner });
    expect(r.grounded).toBe(true);
    expect(r.degraded).toBeUndefined();
    expect(calls).toBe(1);
  });
});

describe('kb.reindex', () => {
  it('AC3 xem trước bắt buộc: đoạn / token / Credit theo giá model đích / dung lượng + cảnh báo khe cũ; xác nhận → building khe B; bấm trùng trả generation đang chạy', async () => {
    const { preview, result } = await reindex();
    expect(preview).toMatchObject({ risk: 'config', count: 150, warnings: ['kb_reindex_old_slot_serves'] });
    // 150 đoạn × 10 token = 1500 token × 0,4 / 1000 = 0,6 → ceil 1 Credit; 150 × 1536 × 4 byte ≈ 900 KB.
    expect(preview.changes[0]).toMatchObject({ entity: 'kb_index', before: { model: `${PX} · mock-embed` }, after: { model: `${PY} · mock-embed`, chunks: 150, tokens: 1500, credits: 1, storage: '900 KB' } });
    expect(result).toMatchObject({ expected: 150, reused: false });
    gen = result.generation_id;
    expect(await (await tenant()).kbEmbedGeneration.findUniqueOrThrow({ where: { id: gen } })).toMatchObject({ slot: 'b', spaceKey: SPACE_Y, phase: 'building', done: 0 });
    expect((await reindex()).result).toMatchObject({ generation_id: gen, reused: true });
    // Trạng thái đọc lại: tiến độ thật.
    expect((await get('/settings/kb')).body.data.index).toMatchObject({ state: 'stale', phase: 'building', generation_id: gen, done: 0, expected: 150 });
  });

  it('AC3 lô 1 xong → tắt worker (drain) → worker mới chết khi giữ lease → lease hết hạn → tiếp đúng cursor (không embed lại lô 1); Credit ceil gộp; publish đổi khe', async () => {
    const db = await tenant();
    let drain = false;
    calls = 0;
    // Drain (045b) sau lô 1: lô đang chạy ghi xong, nhả lease, cursor giữ nguyên.
    expect(await runGeneration(db, h.ws, gen, randomUUID(), { ...deps(), draining: () => drain, dirty: async () => void (drain = true) })).toEqual({ status: 'paused' });
    expect(calls).toBe(1);
    expect(await db.kbEmbedGeneration.findUniqueOrThrow({ where: { id: gen } })).toMatchObject({ phase: 'building', done: 64, batchStep: 1, leaseToken: null });
    // Worker kế tiếp giành lease rồi chết (không nhả) ở lô 2 → job khác bị chặn tới khi lease hết hạn.
    expect(await claimLease(db, gen, randomUUID(), h.clock.now())).not.toBeNull();
    expect(await runGeneration(db, h.ws, gen, randomUUID(), deps())).toEqual({ status: 'busy' });
    h.clock.advance(KB_REINDEX_LEASE_MS + 1_000);
    calls = 0;
    expect(await runGeneration(db, h.ws, gen, randomUUID(), deps())).toEqual({ status: 'published' });
    expect(calls).toBe(2);
    expect(await ids(db, src1)).toEqual(chunkIds);
    expect(await db.kbChunk.count({ where: { sourceId: src1, embedGenerationB: gen, embedSpaceB: SPACE_Y } })).toBe(150);
    expect(await db.kbSetting.findUniqueOrThrow({ where: { id: 1 } })).toMatchObject({ activeSlot: 'b', activeGenerationId: gen, activeSpace: SPACE_Y, indexState: 'current' });
    expect(await db.outboxEvent.count({ where: { topic: 'kb.index_published' } })).toBe(1);
    // 3 lô × 1000 token × 0,4 / 1000 = 1,2 → ceil gộp 2 Credit (không phải 3 × ceil(0,4) = 3).
    const usage = await usageKb();
    expect(usage.reduce((s, x) => s + Math.abs(Number(x.delta)), 0)).toBe(2);
    expect((await get('/settings/kb')).body.data.index).toMatchObject({ state: 'current', active_space_label: `${PY} · mock-embed`, phase: null });
  });

  it('AC5 lease cũ / publish trùng → không đổi lần hai (CAS); tìm kiếm sau publish dùng khe B; trích dẫn đọc lại đúng chunk id cũ', async () => {
    const db = await tenant();
    expect(await publishGeneration(db, h.ws, { id: gen, slot: 'b', spaceKey: SPACE_Y, token: randomUUID() }, h.clock.now())).toEqual({ published: false, reason: 'lost_lease' });
    expect(await db.outboxEvent.count({ where: { topic: 'kb.index_published' } })).toBe(1);
    const r = await searchKb(db, embedder(), { query: QUERY, restriction: owner });
    expect(r.grounded).toBe(true);
    expect(r.citations.length).toBeGreaterThan(0);
    for (const c of r.citations) expect(chunkIds).toContain(c.chunk_id);
    // Trích dẫn 020d lưu (source_id, chunk_id) — đọc lại đúng đoạn sau khi đổi khe.
    const cited = await db.kbChunk.findUniqueOrThrow({ where: { id: r.citations[0]!.chunk_id }, select: { sourceId: true } });
    expect(cited.sourceId).toBe(src1);
  });

  it('AC1 route của khe đang phục vụ (Y) bị gỡ → nhánh vector tắt, degraded embed_space_retired + từ khoá; GET báo suy giảm', async () => {
    route = [X];
    calls = 0;
    const r = await searchKb(await tenant(), embedder(), { query: QUERY, restriction: owner });
    expect(r).toMatchObject({ grounded: true, degraded: 'embed_space_retired' });
    expect(calls).toBe(0);
    expect((await get('/settings/kb')).body.data.index).toMatchObject({ state: 'stale', degraded: 'embed_space_retired' });
  });

  it('AC4 / AC5 reindex lần 2 (B → A theo embed_generation_a): nguồn xoá trong lúc chạy không được ghi; nguồn mới bù ở catch-up; publish', async () => {
    const db = await tenant();
    const gone = await seedSource(3, 'nguồn sẽ bị xoá giữa chừng');
    const { result } = await reindex();
    const g2 = result.generation_id;
    expect(await db.kbEmbedGeneration.findUniqueOrThrow({ where: { id: g2 } })).toMatchObject({ slot: 'a', spaceKey: SPACE_X, expected: 153 });
    let fresh = '';
    let n = 0;
    // Lô 1: xoá nguồn `gone` giữa lúc đọc lô và ghi (embed đã cầm nội dung) → ghi có điều kiện bỏ đoạn đó. Lô 2: thêm nguồn mới → catch-up.
    const racing: Embedder = {
      embed: async (...a) => {
        n++;
        if (n === 1) await db.kbSource.update({ where: { id: gone }, data: { deletedAt: h.clock.now() } });
        if (n === 2) fresh = await seedSource(2, 'nguồn mới thêm trong lúc dựng');
        return embedder().embed(...a);
      },
    };
    expect(await runGeneration(db, h.ws, g2, randomUUID(), deps(racing))).toEqual({ status: 'published' });
    expect(await db.kbChunk.count({ where: { sourceId: src1, embedGenerationA: g2, embedSpaceA: SPACE_X } })).toBe(150);
    expect(await db.kbChunk.count({ where: { sourceId: gone, embedGenerationA: g2 } })).toBe(0);
    expect(await db.kbChunk.count({ where: { sourceId: fresh, embedGenerationA: g2 } })).toBe(2);
    expect(await db.kbSetting.findUniqueOrThrow({ where: { id: 1 } })).toMatchObject({ activeSlot: 'a', activeGenerationId: g2, activeSpace: SPACE_X, indexState: 'current' });
    expect(await db.kbEmbedGeneration.findUniqueOrThrow({ where: { id: gen } })).toMatchObject({ phase: 'superseded', reason: 'replaced' });
    expect((await db.kbEmbedGeneration.findUniqueOrThrow({ where: { id: g2 } })).catchupRound).toBeGreaterThanOrEqual(1);
  });

  it('AC4 huỷ: cancelled, khe đang phục vụ giữ nguyên, khe đích dọn; A→B→C: đang building sang Y, xác nhận sang Z → cũ superseded, một generation dở', async () => {
    const db = await tenant();
    route = [Y, X];
    await get('/settings/kb');
    const g3 = (await reindex()).result.generation_id;
    await claimLease(db, g3, randomUUID(), h.clock.now());
    await db.$executeRaw`UPDATE kb_chunk SET embedding_b = ${VEC}::vector, embed_space_b = ${SPACE_Y}, embed_generation_b = ${g3}::uuid WHERE id = ANY(${chunkIds.slice(0, 5)}::uuid[])`;
    const c = await act('kb.reindex_cancel', {});
    expect(c.status, JSON.stringify(c.body)).toBe(200);
    expect(c.body.data.result).toEqual({ cancelled: true, generation_id: g3 });
    expect(await purgeGeneration(db, g3)).toBe(5);
    expect(await db.kbChunk.count({ where: { embedGenerationB: g3 } })).toBe(0);
    expect(await db.kbSetting.findUniqueOrThrow({ where: { id: 1 } })).toMatchObject({ activeSlot: 'a', activeSpace: SPACE_X });
    expect((await get('/settings/kb')).body.data.index).toMatchObject({ phase: 'cancelled', reason: 'cancelled_by_user' });
    const g4 = (await reindex()).result.generation_id;
    route = [cand('mock-z', 'route-z'), X];
    await h.platform.modelPrice.upsert({ where: { providerKey_model: { providerKey: 'mock-z', model: 'mock-embed' } }, create: { providerKey: 'mock-z', model: 'mock-embed', tier: 'standard', creditsPer1kIn: 0.4, creditsPer1kOut: 0 }, update: {} });
    const { preview, result } = await (async () => {
      const first = await act('kb.reindex', {});
      expect(first.body.data.preview.warnings).toContain('kb_reindex_supersedes');
      const done = await act('kb.reindex', {}, { confirm_token: first.body.data.confirm_token });
      return { preview: first.body.data.preview, result: done.body.data.result };
    })();
    expect(preview.changes[0].after.model).toBe('mock-z · mock-embed');
    expect(result.generation_id).not.toBe(g4);
    expect(await db.kbEmbedGeneration.findUniqueOrThrow({ where: { id: g4 } })).toMatchObject({ phase: 'superseded', reason: 'route_changed' });
    expect(await db.kbEmbedGeneration.count({ where: { phase: { in: ['building', 'catching_up'] } } })).toBe(1);
    await h.platform.modelPrice.deleteMany({ where: { providerKey: 'mock-z' } });
  });

  it('xác nhận với token của space khác (route đổi giữa xem trước và xác nhận) → 409, không tạo generation', async () => {
    route = [Y, X];
    const first = await act('kb.reindex', {});
    route = [X];
    const done = await act('kb.reindex', {}, { confirm_token: first.body.data.confirm_token });
    expect(done.status).toBe(409);
    expect(done.body.error.fields).toMatchObject({ preview: 'stale', space: 'changed' });
    expect(await openGeneration(await tenant())).toMatchObject({ spaceKey: 'mock-z:mock-embed:1536:route-z' });
  });

  it('quyền: sales không có kb.manage → 403', async () => {
    const sales = await h.member('sales');
    expect((await act('kb.reindex', {}, {}, { authorization: `Bearer ${sales.token}` })).status).toBe(403);
    expect((await act('kb.reindex_cancel', {}, {}, { authorization: `Bearer ${sales.token}` })).status).toBe(403);
  });
});

describe('EXPLAIN 100k đoạn', () => {
  it('đếm / catch-up theo generation dùng kb_chunk_embed_generation_*_idx; tìm khe B dùng HNSW khe B', async () => {
    const dbName = (await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } })).dbName;
    const url = (u: string) => u.replace(/\/[^/?]*(\?|$)/, `/${dbName}$1`);
    const c = new pg.Client({ connectionString: url(env.PROVISIONER_DATABASE_URL!) });
    await c.connect();
    try {
      const g = randomUUID();
      // 100k đoạn không vector (HNSW cập nhật từng dòng quá chậm cho test) — 10% đã ghi khe B của generation g.
      await c.query(`INSERT INTO kb_chunk (id, source_id, ord, content, embed_model, embed_space_b, embed_generation_b, token_count)
        SELECT gen_random_uuid(), $1::uuid, n, 'x', 'mock', CASE WHEN n % 10 = 0 THEN $2 END, CASE WHEN n % 10 = 0 THEN $3::uuid END, 10
        FROM generate_series(1, 100000) n`, [src1, SPACE_Y, g]);
      await c.query('ANALYZE kb_chunk');
      const q = async (sql: string, p: unknown[] = [], analyze = true) => (await c.query(`EXPLAIN ${analyze ? '(ANALYZE, BUFFERS) ' : ''}${sql}`, p)).rows.map((x) => x['QUERY PLAN']).join('\n');
      // Dọn khe đích theo lô (purgeGeneration) — seek theo generation, id tăng dần.
      const purge = await q(`SELECT c.id FROM kb_chunk c WHERE c.embed_generation_b = $1::uuid ORDER BY c.id LIMIT 500`, [g]);
      // Lô kế theo cursor (nextIds) — duyệt khoá chính từ cursor, không Sort, dừng sau 64 dòng.
      const next = await q(`SELECT c.id FROM kb_chunk c JOIN kb_source s ON s.id = c.source_id
        WHERE s.deleted_at IS NULL AND s.status = 'ready' AND s.learn AND c.embed_generation_b IS DISTINCT FROM $1::uuid AND c.id > $2::uuid ORDER BY c.id LIMIT 64`, [g, chunkIds[0]]);
      await c.query('SET enable_seqscan = off');
      const vec = await q(`SELECT c.id FROM kb_chunk c ORDER BY c.embedding_b <=> ('[' || array_to_string(array_fill(0.1::real, ARRAY[1536]), ',') || ']')::vector LIMIT 20`, [], false);
      // eslint-disable-next-line no-console -- bằng chứng EXPLAIN dán vào completion report
      console.log(`--- EXPLAIN dọn theo generation (100k) ---\n${purge}\n--- EXPLAIN lô kế theo cursor (100k) ---\n${next}\n--- EXPLAIN vector khe B ---\n${vec}`);
      expect(purge).toMatch(/kb_chunk_embed_generation_b_idx/);
      expect(purge).not.toMatch(/Seq Scan on kb_chunk/);
      expect(next).toMatch(/kb_chunk_pkey/);
      expect(next).not.toMatch(/Sort/);
      expect(vec).toMatch(/kb_chunk_embedding_b_hnsw_idx/);
      await c.query(`DELETE FROM kb_chunk WHERE source_id = $1::uuid AND content = 'x'`, [src1]);
    } finally {
      await c.end();
    }
  }, 300_000);
});
