// Ma trận kb.remove_source (TIP-023b): xoá mềm nguồn (risk delete) → tên · loại · trạng thái + cảnh báo agent thôi dùng; undo khôi phục.
// Nguồn lạ / đã xoá → 404 ở preview. 403 sales (không có kb.manage).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let src: string;
const row = async () => (await m.db()).kbSource.findUniqueOrThrow({ where: { id: src } });

beforeAll(async () => {
  m = await matrix('kb.remove_source');
  src = (await m.seed('kb.add_source', { name: 'Bảng giá 2026', text: 'Gội đầu 100k' })).source_id;
}, 120_000);
afterAll(() => m?.close());

describe('kb.remove_source', () => {
  it('403 sales · nguồn lạ → 404', async () => {
    expect((await m.act({ source_id: src }, m.sales)).status).toBe(403);
    expect((await m.act({ source_id: '0190f000-0000-7000-8000-00000000beef' }, undefined, { 'x-action-source': 'assistant' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const s = await row();
    const { preview, done } = await m.confirm({ source_id: src });
    expect(preview).toEqual({ summary: 'Bảng giá 2026', risk: 'delete', changes: [{ entity: 'kb_source', id: src, before: { name: 'Bảng giá 2026', kind: 'text', status: s.status } }], warnings: ['agents_stop_using'] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await m.act({ source_id: src }, undefined, { 'x-action-source': 'assistant' })).status).toBe(404);
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await row()).deletedAt).toBeNull();
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
