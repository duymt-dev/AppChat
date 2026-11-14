// Ma trận kb.folder.delete (TIP-020b): xoá thư mục rỗng (risk delete) → tên + visibility; còn nguồn / thùng rác / thư mục con →
// HAS_DEPENDENCIES ngay ở preview (không cascade). 403 sales. Undo 24h tạo lại đúng id / tên / visibility.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let empty: string;
let full: string;

beforeAll(async () => {
  m = await matrix('kb.folder.delete');
  empty = (await m.seed('kb.folder.create', { name: 'Tạm', visibility: 'internal' })).folder_id;
  full = (await m.seed('kb.folder.create', { name: 'Có tài liệu' })).folder_id;
  await m.seed('kb.add_source', { name: 'Ghi chú', text: 'abc', folder_id: full });
}, 120_000);
afterAll(() => m?.close());

describe('kb.folder.delete', () => {
  it('403 sales · có nguồn → HAS_DEPENDENCIES', async () => {
    expect((await m.act({ folder_id: empty }, m.sales)).status).toBe(403);
    const r = await m.act({ folder_id: full }, undefined, { 'x-action-source': 'assistant' });
    expect(r.status).toBe(409);
    expect(r.body.error).toMatchObject({ code: 'HAS_DEPENDENCIES', fields: { sources: '1', trashed: '0', children: '0' } });
  });

  it('preview Trợ lý → xác nhận → undo tạo lại', async () => {
    const { preview, done } = await m.confirm({ folder_id: empty, if_version: 1 });
    expect(preview).toEqual({ summary: 'Tạm', risk: 'delete', count: 0, changes: [{ entity: 'kb_folder', id: empty, before: { name: 'Tạm', visibility: 'internal' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(await (await m.db()).kbFolder.count({ where: { id: empty } })).toBe(0);
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect(await (await m.db()).kbFolder.findUniqueOrThrow({ where: { id: empty } })).toMatchObject({ name: 'Tạm', visibility: 'internal' });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
