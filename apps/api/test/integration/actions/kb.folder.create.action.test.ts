// Ma trận kb.folder.create (TIP-023b): thư mục tri thức mới (risk write) → tên; trùng tên không dấu → 409 ở preview. 403 sales (không có
// kb.manage). Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('kb.folder.create');
}, 120_000);
afterAll(() => m?.close());

describe('kb.folder.create', () => {
  it('403 sales', async () => {
    expect((await m.act({ name: 'X' }, m.sales)).status).toBe(403);
  });

  it('preview Trợ lý → xác nhận; trùng tên → 409', async () => {
    const { preview, done } = await m.confirm({ name: 'Bảng giá' });
    expect(preview).toEqual({ summary: 'Bảng giá', risk: 'write', changes: [{ entity: 'kb_folder', after: { name: 'Bảng giá' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await m.act({ name: 'bang gia' }, undefined, { 'x-action-source': 'assistant' })).body.error.fields).toEqual({ name: 'duplicate' });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
