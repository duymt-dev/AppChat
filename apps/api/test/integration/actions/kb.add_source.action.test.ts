// Ma trận kb.add_source (TIP-023b): thêm nguồn tri thức (risk write) → tên · loại · thư mục · học; tài liệu rỗng → cảnh báo không học; thư
// mục lạ → 404, nhiều nguồn cùng lúc → 422 ở preview. 403 sales (không có kb.manage). Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('kb.add_source');
}, 120_000);
afterAll(() => m?.close());

describe('kb.add_source', () => {
  it('403 sales · thư mục lạ → 404 · nhiều nguồn → 422', async () => {
    expect((await m.act({ name: 'X', text: 'Y' }, m.sales)).status).toBe(403);
    expect((await m.act({ name: 'X', text: 'Y', folder_id: '0190f000-0000-7000-8000-00000000beef' }, undefined, { 'x-action-source': 'assistant' })).status).toBe(404);
    expect((await m.act({ name: 'X', text: 'Y', url: 'https://spa.vn' }, undefined, { 'x-action-source': 'assistant' })).status).toBe(422);
  });

  it('preview Trợ lý → xác nhận; tài liệu rỗng → không học', async () => {
    const { preview, done } = await m.confirm({ name: 'Bảng giá 2026', text: 'Gội đầu 100k', tags: ['giá', 'giá'] });
    expect(preview).toEqual({ summary: 'Bảng giá 2026', risk: 'write', changes: [{ entity: 'kb_source', after: { name: 'Bảng giá 2026', kind: 'text', folder: null, tags: ['giá'], visibility: 'public', learn: true } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await m.confirm({ name: 'Quy trình.pdf' })).preview.warnings).toEqual(['not_learned']);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
