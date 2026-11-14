// TIP-032d pha 3 (Postgres 16 thật + bundle parser / validator đóng gói thật): người dùng đưa tệp cho Trợ lý TRƯỚC khi biết đích → Trợ lý đề
// xuất `order.file_attach` với `assistant_artifact_ref` → thẻ xác nhận nêu tên tệp + đích → xác nhận → tệp MỚI riêng tư `record_attachment`
// (cùng bytes, digest khớp) gắn đúng đơn; artifact gốc (purpose attachment / phiên) không đổi. Gửi lại cùng khoá → biên nhận cũ, không bản
// sao thứ hai. Đổi đích sau xem trước → phải xem trước lại (token ràng input). HTML không thành tệp bản ghi; nguồn gỡ sau xem trước → 409;
// đơn chỉ đọc → 403. Đường tải tay (`target_upload_handle`) giữ nguyên.
import 'reflect-metadata';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { STORAGE, prepareArtifact, setValidatorEntry, uuidv7 } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { pdf } from '../../../../fixtures/contracts/files/build-fixtures';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let order: string;
let otherOrder: string;
let sales: { id: string; token: string };
const api = join(import.meta.dirname, '..', '..');
const worker = join(api, '..', 'worker');
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const as = (t?: string) => ({ authorization: `Bearer ${t ?? h.tokenFor(h.user)}` });
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any
const ASSISTANT = { 'x-action-source': 'assistant' };

const act = async (id: string, input: unknown, headers: Record<string, string> = {}, extra: Record<string, unknown> = {}): Promise<Res> => {
  const r = await call(h, `/actions/${id}`, { input, ...extra }, { 'idempotency-key': uuidv7(), ...headers });
  return { status: r.status, body: await r.json() };
};
const seed = async (id: string, input: unknown) => {
  const r = await act(id, input);
  if (r.status !== 200) throw new Error(`seed ${id} ${r.status} ${JSON.stringify(r.body).slice(0, 300)}`);
  return r.body.data.result;
};

/** Tệp đưa cho Trợ lý (purpose attachment) → artifact sẵn sàng (parser sandbox thật). */
async function artifact(name: string, body: Buffer | string, mime: string): Promise<{ id: string; revision: number; fileId: string }> {
  const form = new FormData();
  form.set('purpose', 'attachment');
  form.set('file', new Blob([new Uint8Array(Buffer.from(body))], { type: mime }), name);
  const r = await fetch(`${h.base}/v1/files`, { method: 'POST', headers: { 'x-workspace-id': h.ws, ...as() }, body: form });
  expect(r.status, await r.clone().text()).toBe(201);
  const fileId = ((await r.json()) as { data: { file_id: string } }).data.file_id;
  const a = await act('assistant.attachment_prepare', { file_id: fileId, draft_nonce: uuidv7() });
  const id = a.body.data.result.artifact_id as string;
  const phase = await prepareArtifact(await tenant(), id, { storage: h.app.get(STORAGE, { strict: false }), sandbox: { entry: join(worker, 'dist', 'parser.cjs') }, now: () => new Date(), owner: 'test' });
  expect(phase).toBe('ready');
  return { id, revision: 1, fileId };
}
const ref = (a: { id: string; revision: number }) => ({ kind: 'assistant_artifact_ref', artifact_id: a.id, revision: a.revision });
const revOf = async (o: string) => (await act('order.files_list', { order_id: o })).body.data.result.revision as number;

/** Xem trước (Trợ lý) → token → xác nhận cùng input + khoá. */
async function confirmAttach(input: Record<string, unknown>, key = uuidv7()): Promise<{ preview: Res; done: Res; key: string }> {
  const preview = await act('order.file_attach', input, ASSISTANT);
  expect(preview.status, JSON.stringify(preview.body)).toBe(202);
  const done = await act('order.file_attach', input, { ...ASSISTANT, 'idempotency-key': key }, { confirm_token: preview.body.data.confirm_token });
  return { preview, done, key };
}

beforeAll(async () => {
  execFileSync(process.execPath, [join(worker, 'node_modules', 'tsup', 'dist', 'cli-default.js')], { cwd: worker, stdio: 'ignore' });
  execFileSync(process.execPath, [join(api, 'node_modules', 'tsup', 'dist', 'cli-default.js'), '--silent'], { cwd: api, stdio: 'ignore' });
  setValidatorEntry(join(api, 'dist', 'attachment-validator.cjs'));
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  sales = await h.member('sales');
  const lan = (await seed('contact.create', { full_name: 'Chị Lan artifact', phone: '0909322101' })).contact_id;
  const item = { name: 'Gói tệp', qty: 1, unit_price: '500000', tax_rate: 0 };
  order = (await seed('order.create', { contact_id: lan, items: [item] })).order_id;
  otherOrder = (await seed('order.create', { contact_id: lan, items: [item] })).order_id;
}, 300_000);
afterAll(async () => {
  setValidatorEntry(undefined);
  await resolver?.close();
  await h?.close();
});

describe('sao chép tệp Trợ lý vào đơn — có đồng ý', () => {
  it('xem trước nêu tệp + đơn → xác nhận → tệp MỚI riêng tư cùng bytes gắn đúng đơn; artifact gốc giữ nguyên; gửi lại → biên nhận cũ', async () => {
    const body = pdf({ text: 'BIEN BAN GIAO 101' });
    const a = await artifact('bien-ban-giao.pdf', body, 'application/pdf');
    const input = { order_id: order, source: ref(a), if_revision: await revOf(order) };
    const { preview, done, key } = await confirmAttach(input);
    expect(preview.body.data.preview.summary).toContain('bien-ban-giao.pdf');
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    const r = done.body.data.result;
    expect(r.reused).toBe(false);
    expect(r.file_id).not.toBe(a.fileId);

    const db = await tenant();
    const copy = await db.file.findUnique({ where: { id: r.file_id } });
    const orig = await db.file.findUnique({ where: { id: a.fileId } });
    expect(copy).toMatchObject({ purpose: 'record_attachment', name: 'bien-ban-giao.pdf', sha256: orig!.sha256, confirmed: true });
    expect(orig).toMatchObject({ purpose: 'attachment' });
    expect(await db.assistantInputArtifact.findUnique({ where: { id: a.id }, select: { phase: true, revision: true, fileId: true } })).toEqual({ phase: 'ready', revision: 1, fileId: a.fileId });
    expect(await db.fileClaim.findUnique({ where: { fileId: r.file_id } })).toMatchObject({ parentType: 'order', parentId: order });
    expect(await db.fileClaim.findUnique({ where: { fileId: a.fileId } })).toBeNull();

    const d = await fetch(`${h.base}/v1/files/${r.file_id}`, { headers: { 'x-workspace-id': h.ws, ...as() } });
    expect(d.status).toBe(200);
    expect(createHash('sha256').update(Buffer.from(await d.arrayBuffer())).digest('hex')).toBe(createHash('sha256').update(body).digest('hex'));

    // Gửi lại cùng khoá → đúng biên nhận; không thêm tệp record_attachment nào.
    const before = await db.file.count({ where: { purpose: 'record_attachment', name: 'bien-ban-giao.pdf' } });
    const again = await act('order.file_attach', input, { ...ASSISTANT, 'idempotency-key': key });
    expect(again.body.data.result).toEqual(r);
    // Model gọi lặp cùng nguồn (lượt mới, khoá mới) → liên kết sống cùng digest → reused, không bản sao thứ hai.
    const dup = await confirmAttach({ ...input, if_revision: await revOf(order) });
    expect(dup.done.body.data.result).toMatchObject({ reused: true, file_id: r.file_id });
    expect(await db.file.count({ where: { purpose: 'record_attachment', name: 'bien-ban-giao.pdf' } })).toBe(before);
  });

  it('đổi đích sau xem trước → token không dùng được cho đơn khác (xem trước lại); gắn đơn mới tạo bản sao riêng', async () => {
    const a = await artifact('uy-nhiem-chi.pdf', pdf({ text: 'UNC 102' }), 'application/pdf');
    const p = await act('order.file_attach', { order_id: order, source: ref(a), if_revision: await revOf(order) }, ASSISTANT);
    const moved = await act('order.file_attach', { order_id: otherOrder, source: ref(a), if_revision: await revOf(otherOrder) }, ASSISTANT, { confirm_token: p.body.data.confirm_token });
    expect(moved.status).toBe(202);
    expect(moved.body.data.status).toBe('preview_required');
    const one = await confirmAttach({ order_id: order, source: ref(a), if_revision: await revOf(order) });
    const two = await confirmAttach({ order_id: otherOrder, source: ref(a), if_revision: await revOf(otherOrder) });
    expect(one.done.status).toBe(200);
    expect(two.done.status).toBe(200);
    expect(two.done.body.data.result.file_id).not.toBe(one.done.body.data.result.file_id);
  });

  it('nguồn gỡ sau xem trước → 409, không gắn; HTML không thành tệp bản ghi → 422; đơn chỉ đọc → 403', async () => {
    const a = await artifact('phieu.pdf', pdf({ text: 'PHIEU 103' }), 'application/pdf');
    const input = { order_id: order, source: ref(a), if_revision: await revOf(order) };
    const p = await act('order.file_attach', input, ASSISTANT);
    expect((await act('assistant.attachment_remove', { artifact_id: a.id, if_revision: 1 })).status).toBe(200);
    const late = await act('order.file_attach', input, ASSISTANT, { confirm_token: p.body.data.confirm_token });
    expect(late.status).toBe(409);
    expect(late.body.error.fields).toMatchObject({ source: expect.stringMatching(/stale_revision|changed/) });

    const html = await artifact('trang.html', '<!doctype html><p>Đơn 103</p>', 'text/html');
    const hp = await act('order.file_attach', { order_id: order, source: ref(html), if_revision: await revOf(order) }, ASSISTANT);
    expect(hp.status).toBe(422);
    expect(hp.body.error.fields).toEqual({ source: 'type_not_allowed' });

    // sales (scope own) không được giao đơn → không đọc được → 404 ở xem trước; artifact của người khác → 404 not_found.
    const s = await act('order.file_attach', input, { ...ASSISTANT, ...as(sales.token) });
    expect([403, 404]).toContain(s.status);
  });

  it('đường tải tay vẫn trực tiếp: nguồn ui với artifact ref không đi vòng xem trước nhưng vẫn kiểm cấu trúc + sao chép', async () => {
    const a = await artifact('hop-dong.pdf', pdf({ text: 'HD 104' }), 'application/pdf');
    const r = await act('order.file_attach', { order_id: order, source: ref(a), if_revision: await revOf(order) });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const db = await tenant();
    expect(await db.file.findUnique({ where: { id: r.body.data.result.file_id }, select: { purpose: true } })).toEqual({ purpose: 'record_attachment' });
    expect(await db.attachmentStaging.findUnique({ where: { fileId: r.body.data.result.file_id } })).toBeNull();
  });
});
