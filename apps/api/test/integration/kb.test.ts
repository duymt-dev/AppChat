// TIP-020 AC1, AC4–AC6 trên Postgres 16 (pgvector + pg_trgm) + Memurai: migration 020 (index viết tay, EXPLAIN), POST /v1/files →
// kb.add_source → worker ROLE=ai (`kb-ingest`, embedding giả tất định) → `ready` + đoạn + trừ credit embed; trùng tệp 409; learn=false;
// tệp hỏng → failed; tìm kết hợp (không dấu, internal / public, thư mục / thẻ, không bịa, không trả đoạn có giá, trích nguồn);
// GET /v1/settings/kb khớp schema FE; update / remove + undo / refresh / folder.create; sales 403.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import pg from 'pg';
import PizZip from 'pizzip';
import { AiJobsModule, CLOCK, KernelModule, LOGGER, WalletService, createLogger, searchKb, uuidv7 } from '@appchat/core';
import { AiSdkEmbedder, mockEmbedSource } from '@appchat/ai';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { kbDataSchema } from '@appchat/shared';
import { call, env, startApi, type Harness } from './setup';
import { until } from './worker.harness';

let h: Harness;
let ai: TestingModule;
let resolver: TenantDbResolver;
let sales: { id: string; token: string };

beforeAll(async () => {
  h = await startApi();
  sales = await h.member('sales');
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  ai = await Test.createTestingModule({ imports: [KernelModule.forRoot({ ...env, LOG_LEVEL: 'silent' }), AiJobsModule] })
    .overrideProvider(LOGGER)
    .useValue(createLogger({ level: 'silent' }))
    .overrideProvider(CLOCK)
    .useValue(h.clock)
    .compile();
  await ai.init();
  await h.app.get(WalletService, { strict: false }).topup(h.ws, 1000, { refType: 'test', refId: uuidv7() });
});
afterAll(async () => {
  await ai?.close();
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (u: { token: string }) => ({ authorization: `Bearer ${u.token}` });
const act = (id: string, input: unknown, headers: Record<string, string> = {}) => call(h, `/actions/${id}`, { input }, headers).then(json);
const get = (path: string, who?: { token: string }) => call(h, path, undefined, who ? as(who) : {}).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const wallet = () => h.app.get(WalletService, { strict: false });
const search = async (query: string, o: { visibility?: ('public' | 'internal')[]; folderIds?: string[]; tags?: string[] } = {}) =>
  searchKb(await tenant(), new AiSdkEmbedder(mockEmbedSource()), { query, visibility: o.visibility ?? ['public'], ...o });

async function upload(name: string, body: string | Buffer, mime = 'text/markdown', who?: { token: string }) {
  const form = new FormData();
  form.set('purpose', 'kb');
  form.set('file', new Blob([body], { type: mime }), name);
  const r = await fetch(`${h.base}/v1/files`, { method: 'POST', headers: { 'x-workspace-id': h.ws, authorization: who ? `Bearer ${who.token}` : `Bearer ${h.tokenFor(h.user)}` }, body: form });
  return json(r);
}
const statusOf = async (id: string) => (await (await tenant()).kbSource.findUniqueOrThrow({ where: { id } })).status;
const ready = (id: string) => until(async () => ['ready', 'failed'].includes(await statusOf(id)));

const POLICY = `# Chính sách Spa An

## Đổi trả
Khách được đổi liệu trình trong 7 ngày nếu chưa sử dụng buổi nào. Liên hệ lễ tân để làm thủ tục đổi.

## Giờ mở cửa
Spa mở cửa từ 8 giờ sáng đến 8 giờ tối, kể cả chủ nhật.

## Bảng giá
Gói HIFU giá 2.500.000đ một lần.
`;
let policyId = '';
let internalId = '';
let folderId = '';

describe('schema', () => {
  it('AC1 migration 020: HNSW + GIN trgm + partial + unique sha256; EXPLAIN từ khoá dùng GIN, nguồn theo thư mục dùng partial', async () => {
    const db = await tenant();
    const idx = (await db.$queryRaw<{ indexname: string }[]>`SELECT indexname FROM pg_indexes WHERE tablename IN ('kb_chunk','kb_source','kb_folder')`).map((r) => r.indexname);
    expect(idx).toEqual(expect.arrayContaining(['kb_chunk_embedding_hnsw_idx', 'kb_chunk_content_norm_trgm_idx', 'kb_source_folder_status_idx', 'kb_source_tags_gin_idx', 'kb_source_sha256_live_key', 'kb_chunk_source_id_ord_idx']));
    await expect(db.kbSetting.create({ data: { id: 2 } })).rejects.toThrow(/kb_setting_singleton/);
    const c = new pg.Client({ connectionString: env.TENANT_DATABASE_URL!.replace(/\/[^/?]*(\?|$)/, `/${(await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } })).dbName}$1`) });
    await c.connect();
    try {
      await c.query('SET enable_seqscan = off');
      const q = (sql: string) => c.query(`EXPLAIN ${sql}`).then((r) => r.rows.map((x) => x['QUERY PLAN']).join('\n'));
      expect(await q(`SELECT id FROM kb_chunk WHERE 'doi tra' <% content_norm LIMIT 20`)).toMatch(/kb_chunk_content_norm_trgm_idx/);
      expect(await q(`SELECT id FROM kb_source WHERE folder_id = '${uuidv7()}'::uuid AND status = 'ready' AND deleted_at IS NULL`)).toMatch(/kb_source_folder_status_idx/);
      expect(await q(`SELECT id FROM kb_chunk ORDER BY embedding <=> ('[' || array_to_string(array_fill(0.1::real, ARRAY[1536]), ',') || ']')::vector LIMIT 20`)).toMatch(/kb_chunk_embedding_hnsw_idx/);
    } finally {
      await c.end();
    }
  });
});

describe('nạp tài liệu', () => {
  it('AC4 tải .md → kb.add_source → worker nạp → ready, đoạn có đường dẫn đề mục, trừ credit embed; đoạn có giá gắn volatile', async () => {
    const f = await upload('Chính sách.md', POLICY);
    expect(f.status, JSON.stringify(f.body)).toBe(201);
    const before = (await wallet().balance(h.ws)).total;
    const r = await act('kb.add_source', { name: 'Chính sách.md', file_id: f.body.data.file_id, tags: ['Policy'], visibility: 'public' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    policyId = r.body.data.result.source_id;
    expect(await ready(policyId)).toBe(true);
    const s = await (await tenant()).kbSource.findUniqueOrThrow({ where: { id: policyId } });
    expect(s).toMatchObject({ status: 'ready', kind: 'md', origin: 'upload', learn: true });
    expect(s.chunkCount).toBeGreaterThan(0);
    const chunks = await (await tenant()).kbChunk.findMany({ where: { sourceId: policyId }, orderBy: { ord: 'asc' } });
    expect(chunks.some((c) => (c.meta as { path?: string[] }).path?.includes('Đổi trả'))).toBe(true);
    expect(chunks.some((c) => (c.meta as { volatile?: boolean }).volatile)).toBe(true);
    expect((await wallet().balance(h.ws)).total).toBeLessThan(before);
    expect(await h.platform.creditLedger.count({ where: { workspaceId: h.ws, source: 'kb' } })).toBe(1);
  });

  it('AC4 cùng tệp lần hai → 409 kèm id nguồn cũ; learn=false → ready 0 đoạn; tệp hỏng → failed + lý do', async () => {
    const again = await upload('copy.md', POLICY);
    const dup = await act('kb.add_source', { name: 'copy.md', file_id: again.body.data.file_id });
    expect(dup.status).toBe(409);
    expect(dup.body.error.fields).toMatchObject({ file_id: 'duplicate', source_id: policyId });
    const keep = await upload('Hợp đồng mẫu.md', '# Hợp đồng\n\nĐiều khoản thanh toán nội bộ, chiết khấu đại lý.');
    const k = await act('kb.add_source', { name: 'Hợp đồng mẫu.md', file_id: keep.body.data.file_id, learn: false, visibility: 'internal' });
    expect(await ready(k.body.data.result.source_id)).toBe(true);
    expect(await (await tenant()).kbSource.findUniqueOrThrow({ where: { id: k.body.data.result.source_id } })).toMatchObject({ status: 'ready', chunkCount: 0 });
    // TIP-045b: tệp không phải DOCX mang đuôi .docx bị cổng tải tệp chặn (415) trước khi thành nguồn.
    const bad = await upload('hỏng.docx', 'không phải docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(bad.status).toBe(415);
    expect(bad.body.error.fields).toEqual({ file: 'type_mismatch' });
    // Gói DOCX hợp lệ về hình dạng nhưng nội dung hỏng vẫn qua cổng → ingest báo failed (lớp parse).
    const z = new PizZip();
    z.file('[Content_Types].xml', '<Types/>');
    z.file('word/document.xml', 'không phải xml');
    const broken = await upload('hỏng-2.docx', z.generate({ type: 'nodebuffer' }) as Buffer, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    const b = await act('kb.add_source', { name: 'hỏng-2.docx', file_id: broken.body.data.file_id });
    expect(await ready(b.body.data.result.source_id)).toBe(true);
    expect(await (await tenant()).kbSource.findUniqueOrThrow({ where: { id: b.body.data.result.source_id } })).toMatchObject({ status: 'failed' });
  });

  it('AC4 văn bản nhập tay + internal + thư mục', async () => {
    const f = await act('kb.folder.create', { name: 'Nội bộ' }, { 'idempotency-key': uuidv7() });
    expect(f.status, JSON.stringify(f.body)).toBe(200);
    folderId = f.body.data.result.folder_id;
    expect((await act('kb.folder.create', { name: 'noi bo' }, { 'idempotency-key': uuidv7() })).status).toBe(409);
    const r = await act('kb.add_source', { name: 'Quy trình nội bộ', text: 'Quy trình xử lý khiếu nại: trưởng ca gọi lại khách trong 2 giờ.', visibility: 'internal', folder_id: folderId, tags: ['Quy trình'] });
    internalId = r.body.data.result.source_id;
    expect(await ready(internalId)).toBe(true);
    expect(await statusOf(internalId)).toBe('ready');
  });
});

describe('tìm kết hợp', () => {
  it('AC5 câu không dấu khớp đoạn có dấu + trích nguồn; câu không liên quan → không căn cứ', async () => {
    const r = await search('chinh sach doi tra lieu trinh');
    expect(r.grounded, JSON.stringify({ top: r.top_score, min: r.min_score })).toBe(true);
    expect(r.chunks[0]!.content).toContain('đổi liệu trình trong 7 ngày');
    expect(r.citations[0]).toEqual({ source_id: policyId, chunk_id: r.chunks[0]!.chunk_id });
    const none = await search('thời tiết hà nội tuần sau thế nào');
    expect(none).toMatchObject({ grounded: false, chunks: [] });
  });

  it('AC5 internal không ra cho khách; ra khi được xem internal; lọc thư mục / thẻ; đoạn có giá không bao giờ ra', async () => {
    expect((await search('quy trình xử lý khiếu nại')).chunks.some((c) => c.source_id === internalId)).toBe(false);
    const inside = await search('quy trình xử lý khiếu nại', { visibility: ['public', 'internal'] });
    expect(inside.chunks[0]!.source_id).toBe(internalId);
    expect((await search('đổi trả', { visibility: ['public', 'internal'], folderIds: [folderId] })).chunks.every((c) => c.source_id === internalId)).toBe(true);
    expect((await search('đổi trả', { tags: ['Policy'] })).chunks.every((c) => c.source_id === policyId)).toBe(true);
    const price = await search('gói HIFU giá bao nhiêu');
    expect(price.chunks.some((c) => /2\.500\.000/.test(c.content))).toBe(false);
  });

  it('AC5 action kb.search: Owner thấy internal, sales chỉ public', async () => {
    const o = await act('kb.search', { query: 'quy trình xử lý khiếu nại' });
    expect(o.status, JSON.stringify(o.body)).toBe(200);
    expect(o.body.data.result.chunks[0].source_id).toBe(internalId);
    const s = await act('kb.search', { query: 'quy trình xử lý khiếu nại' }, as(sales));
    expect(s.status, JSON.stringify(s.body)).toBe(200);
    expect(s.body.data.result.chunks.some((c: { source_id: string }) => c.source_id === internalId)).toBe(false);
  });
});

describe('HTTP + action', () => {
  it('AC6 GET /v1/settings/kb khớp schema FE; nav đếm; lọc thư mục / tìm tên không dấu; sales 403', async () => {
    const r = await get('/settings/kb');
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const d = kbDataSchema.parse(r.body.data);
    expect(d.folders.map((f) => f.name)).toContain('Nội bộ');
    expect(d.data.find((x) => x.id === policyId)).toMatchObject({ name: 'Chính sách.md', type: 'md', learned: true, source: 'upload', by: 'Owner', visibility: 'public', status: 'ready' });
    expect(d.nav.all).toBe(d.data.length);
    expect((await get(`/settings/kb?folder=${folderId}`)).body.data.data.map((x: { id: string }) => x.id)).toEqual([internalId]);
    expect((await get('/settings/kb?q=chinh sach')).body.data.data.map((x: { id: string }) => x.id)).toEqual([policyId]);
    expect((await get('/settings/kb', sales)).status).toBe(403);
  });

  it('AC6 update_source + undo; remove_source → thùng rác, tìm không còn; undo trả lại; refresh_source đẩy nạp lại', async () => {
    const u = await act('kb.update_source', { source_id: policyId, visibility: 'internal', starred: true });
    expect(u.status).toBe(200);
    expect((await search('chinh sach doi tra')).chunks.some((c) => c.source_id === policyId)).toBe(false);
    expect((await call(h, `/action-logs/${u.body.data.action_log_id}/undo`, {})).status).toBe(200);
    expect(await (await tenant()).kbSource.findUniqueOrThrow({ where: { id: policyId } })).toMatchObject({ visibility: 'public', starred: false });

    const rm = await act('kb.remove_source', { source_id: policyId });
    expect(rm.status).toBe(200);
    expect((await search('chinh sach doi tra')).grounded).toBe(false);
    expect((await get('/settings/kb?nav=trash')).body.data.data.map((x: { id: string }) => x.id)).toContain(policyId);
    expect((await call(h, `/action-logs/${rm.body.data.action_log_id}/undo`, {})).status).toBe(200);
    expect((await search('chinh sach doi tra')).grounded).toBe(true);

    const rf = await act('kb.refresh_source', { source_id: policyId });
    expect(rf.body.data.result).toEqual({ queued: 1 });
    expect(await until(async () => (await statusOf(policyId)) === 'ready')).toBe(true);
    expect((await act('kb.remove_source', { source_id: uuidv7() })).status).toBe(404);
  });

  it('AC6 sales không có kb.manage → ghi 403, tải tệp kb 403', async () => {
    expect((await act('kb.folder.create', { name: 'X' }, { ...as(sales), 'idempotency-key': uuidv7() })).status).toBe(403);
    expect((await upload('a.md', '# a', 'text/markdown', sales)).status).toBe(403);
  });
});
