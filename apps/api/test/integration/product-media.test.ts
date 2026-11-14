// TIP-027b trên Postgres 16 + Memurai — pha 1: mô tả có định dạng. Tạo / sửa với `description_doc` (chữ thuần dẫn ra ở server, lệch → 422);
// client cũ gửi lại nguyên chữ → giữ định dạng, đổi chữ → một đoạn mỗi dòng; hoàn tác cũ sau lần sửa mới → 409 (không xoá thay đổi mới);
// chi tiết trả tài liệu, danh sách không mang; nhập 032b: cột JSON khứ hồi, chữ thuần khác → định dạng reset.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7() }).then(json);
const ok = (r: { status: number; body: unknown }) => {
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return (r.body as { data: { result: Record<string, any>; action_log_id: string } }).data; // eslint-disable-line @typescript-eslint/no-explicit-any
};
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const detail = async (id: string) => (await json(await call(h, `/products/${id}`))).body.data;

const txt = (text: string, marks?: string[]) => ({ type: 'text', text, ...(marks ? { marks } : {}) });
const doc = {
  type: 'doc',
  version: 1,
  content: [
    { type: 'paragraph', content: [txt('Serum '), txt('B5', ['bold'])] },
    { type: 'bullet_list', content: [{ type: 'list_item', content: [txt('Dịu da', ['italic'])] }] },
  ],
};

async function upload(name: string, text: string) {
  const form = new FormData();
  form.set('purpose', 'import');
  form.set('file', new Blob([Buffer.from(text, 'utf8')], { type: 'text/csv' }), name);
  const r = await fetch(`${h.base}/v1/files`, { method: 'POST', headers: { 'x-workspace-id': h.ws, authorization: `Bearer ${h.tokenFor(h.user)}` }, body: form });
  expect(r.status).toBe(201);
  return ((await r.json()) as { data: { file_id: string } }).data.file_id;
}
async function importCsv(csv: string, mapping: Record<string, string>) {
  const key = uuidv7();
  const input = { file_id: await upload('mo-ta.csv', csv), mapping };
  const p = await json(await call(h, '/actions/product.import', { input }, { 'idempotency-key': key }));
  expect(p.status, JSON.stringify(p.body)).toBe(202);
  const r = ok(await json(await call(h, '/actions/product.import', { input, confirm_token: p.body.data.confirm_token }, { 'idempotency-key': key }))).result;
  // ≤ 500 dòng chạy ngay sau commit (032b) — trạng thái lần nhập đọc lại qua route biên nhận.
  return (await json(await call(h, `/product-imports/${r.import_id}`))).body.data as { status: string; created: number; updated: number; failed: number };
}

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
}, 120_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('mô tả có định dạng — product.create / update / undo / đọc', () => {
  it('create với tài liệu → chữ thuần dẫn ra; chữ kèm lệch → 422 mismatch_doc; tài liệu có HTML → 422; danh sách không mang tài liệu', async () => {
    const id = ok(await act('product.create', { name: 'Serum B5', type: 'physical', price: '100000', description_doc: doc })).result.product_id as string;
    const d = await detail(id);
    expect(d.description).toBe('Serum B5\nDịu da');
    expect(d.description_doc.content[0].content[1]).toEqual(txt('B5', ['bold']));
    const bad = await act('product.create', { name: 'X', type: 'physical', price: '1', description: 'khác', description_doc: doc });
    expect([bad.status, bad.body.error.fields]).toEqual([422, { description: 'mismatch_doc' }]);
    const html = await act('product.create', { name: 'X', type: 'physical', price: '1', description_doc: { type: 'doc', version: 1, content: [{ type: 'html', html: '<script>' }] } });
    expect(html.status).toBe(422);
    const list = (await json(await call(h, '/products?q=Serum%20B5'))).body.data as Record<string, unknown>[];
    expect(list.find((p) => p.id === id)).toBeTruthy();
    expect(list.find((p) => p.id === id)).not.toHaveProperty('description_doc');
  });

  it('client cũ gửi lại nguyên chữ → giữ định dạng; đổi chữ → một đoạn mỗi dòng; rỗng → xoá cả hai', async () => {
    const id = ok(await act('product.create', { name: 'Kem', type: 'physical', price: '1000', description_doc: doc })).result.product_id as string;
    ok(await act('product.update', { product_id: id, patch: { description: 'Serum B5\nDịu da', price: '2000' } }));
    expect(JSON.stringify((await detail(id)).description_doc)).toContain('bold');
    ok(await act('product.update', { product_id: id, patch: { description: 'Mới\n**không đậm**' } }));
    const d = await detail(id);
    expect(d.description).toBe('Mới\n**không đậm**');
    expect(JSON.stringify(d.description_doc)).not.toContain('marks');
    ok(await act('product.update', { product_id: id, patch: { description: '' } }));
    const row = await (await tenant()).product.findUniqueOrThrow({ where: { id }, select: { description: true, descriptionDoc: true } });
    expect(row).toEqual({ description: '', descriptionDoc: null });
  });

  it('hoàn tác lần sửa cũ sau khi đã có lần sửa mới → 409 superseded; hoàn tác theo thứ tự → khôi phục định dạng', async () => {
    const id = ok(await act('product.create', { name: 'Toner', type: 'physical', price: '1000', description_doc: doc })).result.product_id as string;
    const first = ok(await act('product.update', { product_id: id, patch: { description: 'Lần 1' } }));
    h.clock.advance(1000);
    const second = ok(await act('product.update', { product_id: id, patch: { description: 'Lần 2' } }));
    const stale = await json(await call(h, `/action-logs/${first.action_log_id}/undo`, {}));
    expect([stale.status, stale.body.error?.fields]).toEqual([409, { undo: 'superseded' }]);
    expect((await call(h, `/action-logs/${second.action_log_id}/undo`, {})).status).toBe(200);
    expect((await detail(id)).description).toBe('Lần 1');
    // Undo của lần 2 cũng tăng version → lần 1 vẫn là "cũ" so với hiện trạng (an toàn: không ghi đè trạng thái người khác vừa khôi phục).
    const again = await json(await call(h, `/action-logs/${first.action_log_id}/undo`, {}));
    expect(again.status).toBe(409);
  });
});

describe('mô tả có định dạng — nhập 032b', () => {
  it('cột JSON khứ hồi định dạng; JSON hỏng → lỗi dòng; chữ thuần giữ nguyên → giữ, khác → reset', async () => {
    const cell = `"${JSON.stringify(doc).replace(/"/g, '""')}"`;
    const r = await importCsv(`Tên,Giá,Mã,Mô tả định dạng\nSerum A,1000,DOC-A,${cell}\nSerum B,1000,DOC-B,{hỏng\n`, { name: 'Tên', price: 'Giá', sku: 'Mã', description_doc: 'Mô tả định dạng' });
    expect(r).toMatchObject({ status: 'completed', created: 1, failed: 1 });
    const db = await tenant();
    const a = await db.product.findUniqueOrThrow({ where: { code: 'DOC-A' }, select: { id: true, description: true, descriptionDoc: true } });
    expect(a.description).toBe('Serum B5\nDịu da');
    expect(JSON.stringify(a.descriptionDoc)).toContain('bold');
    await importCsv('Tên,Giá,Mã,Mô tả\nSerum A,1000,DOC-A,"Serum B5\nDịu da"\n', { name: 'Tên', price: 'Giá', sku: 'Mã', description: 'Mô tả' });
    expect(JSON.stringify((await detail(a.id)).description_doc)).toContain('bold');
    await importCsv('Tên,Giá,Mã,Mô tả\nSerum A,1000,DOC-A,Chữ mới\n', { name: 'Tên', price: 'Giá', sku: 'Mã', description: 'Mô tả' });
    const reset = await detail(a.id);
    expect([reset.description, JSON.stringify(reset.description_doc).includes('marks')]).toEqual(['Chữ mới', false]);
  });
});
