// TIP-023f §1, §2, §5 (Postgres 16 thật + bundle parser đóng gói thật): tải tệp lên → `assistant.attachment_prepare` (một artifact,
// gọi lại cùng nháp + tệp → cùng hàng, một sự kiện) → prepareArtifact trong sandbox → `ready`, phần có vị trí trang / bản ghi →
// `attachment_read` phân trang trung thực; tệp của người khác → 404; gỡ đúng revision → cancelled, revision cũ → 409; ảnh → phần
// image_ref (không URL); EXPLAIN truy vấn nháp dùng index draft; tối đa 5 tệp / nháp.
import 'reflect-metadata';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { STORAGE, prepareArtifact, uuidv7 } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { pdf } from '../../../../fixtures/contracts/files/build-fixtures';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
const worker = join(import.meta.dirname, '..', '..', '..', 'worker');
const entry = join(worker, 'dist', 'parser.cjs');
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const bearer = (t: string) => ({ authorization: `Bearer ${t}` });

async function upload(name: string, body: Buffer | string, mime: string, token = h.token) {
  const form = new FormData();
  form.set('purpose', 'attachment');
  form.set('file', new Blob([new Uint8Array(Buffer.from(body))], { type: mime }), name);
  const r = await fetch(`${h.base}/v1/files`, { method: 'POST', headers: { 'x-workspace-id': h.ws, ...bearer(token) }, body: form });
  expect(r.status, await r.clone().text()).toBe(201);
  return ((await r.json()) as { data: { file_id: string } }).data.file_id;
}
const act = async (id: string, input: unknown, headers: Record<string, string> = {}) => {
  const r = await call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...headers });
  return { status: r.status, body: (await r.json()) as { data?: { result?: Record<string, unknown> }; error?: { code: string } } };
};
type Json = { data: Record<string, unknown> };
const json = async (r: Response) => (await r.json()) as Json;
const prepare = async (id: string) => prepareArtifact(await tenant(), id, { storage: h.app.get(STORAGE, { strict: false }), sandbox: { entry }, now: () => new Date(), owner: 'test' });

beforeAll(async () => {
  execFileSync(process.execPath, [join(worker, 'node_modules', 'tsup', 'dist', 'cli-default.js')], { cwd: worker, stdio: 'ignore' });
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
}, 240_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('đầu vào Trợ lý trên DB thật', () => {
  it('PDF: prepare idempotent → sandbox → ready theo trang; read phân trang; gỡ đúng revision', async () => {
    const draft = uuidv7();
    const file = await upload('bao-gia.pdf', pdf({ pages: 3, text: 'CANARY IN-77' }), 'application/pdf');
    const a = await act('assistant.attachment_prepare', { file_id: file, draft_nonce: draft });
    expect(a.status, JSON.stringify(a.body)).toBe(200);
    const id = a.body.data!.result!.artifact_id as string;
    const again = await act('assistant.attachment_prepare', { file_id: file, draft_nonce: draft, name: 'gia-mao.exe' });
    expect(again.body.data!.result!.artifact_id).toBe(id);
    const db = await tenant();
    expect(await db.outboxEvent.count({ where: { topic: 'assistant.input_prepare_requested', payload: { path: ['artifact_id'], equals: id } } })).toBe(1);

    expect(await prepare(id)).toBe('ready');
    const g = await act('assistant.attachment_get', { artifact_id: id });
    expect(g.body.data!.result).toMatchObject({ phase: 'ready', kind: 'pdf', part_count: 3, name: 'bao-gia.pdf', source_available: true });
    const r1 = await act('assistant.attachment_read', { artifact_id: id, revision: 1, limit: 2 });
    expect(r1.body.data!.result).toMatchObject({ has_more: true, next_cursor: '2', parts: [{ locator: { kind: 'page', page: 1 } }, { locator: { page: 2 } }] });
    expect(JSON.stringify(r1.body)).toContain('IN-77');
    const r2 = await act('assistant.attachment_read', { artifact_id: id, revision: 1, cursor: '2' });
    expect(r2.body.data!.result).toMatchObject({ has_more: false, next_cursor: null, parts: [{ locator: { page: 3 } }] });

    expect((await act('assistant.attachment_remove', { artifact_id: id, if_revision: 9 })).status).toBe(409);
    expect((await act('assistant.attachment_remove', { artifact_id: id, if_revision: 1 })).body.data!.result).toMatchObject({ phase: 'cancelled', revision: 2 });
    expect(await db.assistantInputPart.count({ where: { artifactId: id } })).toBe(0);
  });

  it('CSV bản ghi nhiều dòng giữ vị trí; ảnh → image_ref, không URL; tệp hỏng → failed có lý do', async () => {
    const draft = uuidv7();
    const csv = await act('assistant.attachment_prepare', { file_id: await upload('kh.csv', 'ten,ghi_chu\nAn,"dòng 1\ndòng 2"\n\nBinh,ok\n', 'text/csv'), draft_nonce: draft });
    const cid = csv.body.data!.result!.artifact_id as string;
    expect(await prepare(cid)).toBe('ready');
    const rows = (await act('assistant.attachment_read', { artifact_id: cid, revision: 1 })).body.data!.result!.parts as { locator: Record<string, number> }[];
    expect(rows.map((p) => [p.locator.record, p.locator.line_start, p.locator.line_end])).toEqual([[2, 2, 3], [3, 5, 5]]);

    const png = Buffer.alloc(64);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]).copy(png, 0);
    png.write('IHDR', 12, 'latin1');
    png.writeUInt32BE(640, 16);
    png.writeUInt32BE(480, 20);
    png.write('IDAT', 40, 'latin1');
    const img = await act('assistant.attachment_prepare', { file_id: await upload('anh.png', png, 'image/png'), draft_nonce: draft });
    const iid = img.body.data!.result!.artifact_id as string;
    expect(await prepare(iid)).toBe('ready');
    const ir = await act('assistant.attachment_read', { artifact_id: iid, revision: 1 });
    expect(ir.body.data!.result!.parts).toEqual([{ locator: { kind: 'image' }, image_ref: `image:${iid}:0` }]);
    expect(JSON.stringify(ir.body)).not.toMatch(/storage|https?:/);

    const bad = await act('assistant.attachment_prepare', { file_id: await upload('hong.pdf', Buffer.from('%PDF-1.4 garbage garbage'), 'application/pdf'), draft_nonce: draft });
    const bid = bad.body.data!.result!.artifact_id as string;
    expect(await prepare(bid)).toBe('failed');
    expect((await act('assistant.attachment_get', { artifact_id: bid })).body.data!.result).toMatchObject({ phase: 'failed', error_reason: 'corrupt', part_count: 0 });
  });

  it('tệp / artifact của người khác → 404; tối đa 5 tệp / nháp', async () => {
    const other = await h.member('sales');
    const theirs = await upload('cua-ho.txt', 'bí mật', 'text/plain', other.token);
    expect((await act('assistant.attachment_prepare', { file_id: theirs, draft_nonce: uuidv7() })).status).toBe(404);
    const mine = await act('assistant.attachment_prepare', { file_id: await upload('cua-toi.txt', 'xin chào', 'text/plain'), draft_nonce: uuidv7() });
    const foreign = await act('assistant.attachment_get', { artifact_id: mine.body.data!.result!.artifact_id }, bearer(other.token));
    expect(foreign.status).toBe(404);

    const draft = uuidv7();
    for (let i = 0; i < 5; i++) expect((await act('assistant.attachment_prepare', { file_id: await upload(`t${i}.txt`, `nội dung ${i}`, 'text/plain'), draft_nonce: draft })).status).toBe(200);
    const sixth = await act('assistant.attachment_prepare', { file_id: await upload('t6.txt', 'thứ sáu', 'text/plain'), draft_nonce: draft });
    expect(sixth.status).toBe(422);
  });

  it('GET /assistant/input/:id (+ /parts): cùng dịch vụ đọc có guard với action; người khác / id lạ → 404; lượt rỗng không tệp → 422', async () => {
    const id = (await act('assistant.attachment_prepare', { file_id: await upload('ghi.txt', 'GET-CANARY dòng một', 'text/plain'), draft_nonce: uuidv7() })).body.data!.result!.artifact_id as string;
    const queued = await json(await call(h, `/assistant/input/${id}`));
    expect(queued.data).toMatchObject({ artifact_id: id, phase: 'queued', source_available: true });
    expect(await prepare(id)).toBe('ready');
    expect((await json(await call(h, `/assistant/input/${id}`))).data).toMatchObject({ phase: 'ready', kind: 'text', part_count: 1 });
    const parts = await json(await call(h, `/assistant/input/${id}/parts?revision=1&limit=1`));
    expect(parts.data).toMatchObject({ has_more: false, parts: [{ locator: { kind: 'paragraph', paragraph: 1 } }] });
    expect(JSON.stringify(parts)).toContain('GET-CANARY');
    expect((await call(h, `/assistant/input/${id}/parts?revision=7`)).status).toBe(409);
    const other = await h.member('sales');
    expect((await call(h, `/assistant/input/${id}`, undefined, bearer(other.token))).status).toBe(404);
    expect((await call(h, '/assistant/input/khong-phai-uuid')).status).toBe(404);
    expect((await call(h, '/assistant/messages', { text: '   ' })).status).toBe(422);
  });

  it('EXPLAIN: tệp của nháp dùng index draft, việc chờ dùng index work', async () => {
    const db = await tenant();
    await db.$executeRawUnsafe('SET enable_seqscan = off');
    const q = async (sql: string) => (await db.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(`EXPLAIN ${sql}`)).map((r) => r['QUERY PLAN']).join('\n');
    expect(await q(`SELECT id, phase, revision, file_id FROM assistant_input_artifact WHERE owner_user_id = '${h.user}' AND draft_nonce = '${uuidv7()}' ORDER BY created_at, id`)).toMatch(/assistant_input_artifact_draft_idx/);
    expect(await q(`SELECT id FROM assistant_input_artifact WHERE phase = 'queued' ORDER BY lease_until, id LIMIT 20`)).toMatch(/assistant_input_artifact_work_idx/);
    await db.$executeRawUnsafe('RESET enable_seqscan');
  });
});
