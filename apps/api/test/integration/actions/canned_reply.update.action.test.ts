// Ma trận canned_reply.update (TIP-023b): preview Trợ lý (trước / sau chỉ trường đổi) · 403 (sales) · id lạ → 404 · trùng phím tắt → 409 ·
// gọi lặp cùng giá trị cùng kết quả. Scope: cấu hình workspace. Undo: không khai; trạng thái: không có.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let id: string;

beforeAll(async () => {
  m = await matrix('canned_reply.update');
  id = (await m.seed('canned_reply.create', { shortcut: '/gio', title: 'Giờ mở cửa', body: 'Mở 8h–20h.', category: 'Chung' })).reply_id;
  await m.seed('canned_reply.create', { shortcut: '/gia', title: 'Bảng giá', body: 'Gửi chị bảng giá.', category: 'Bán hàng' });
}, 120_000);
afterAll(() => m?.close());

describe('canned_reply.update', () => {
  it('preview Trợ lý: trước / sau chỉ trường đổi → xác nhận → lưu', async () => {
    const { preview, done } = await m.confirm({ reply_id: id, body: 'Mở 8h–21h.', title: 'Giờ mở cửa' });
    expect(preview).toEqual({ summary: '/gio · Giờ mở cửa', risk: 'config', changes: [{ entity: 'canned_reply', id, before: { body: 'Mở 8h–20h.' }, after: { body: 'Mở 8h–21h.' } }] });
    expect(done.status).toBe(200);
  });

  it('403 sales · id lạ → 404 · trùng phím tắt → 409', async () => {
    expect((await m.act({ reply_id: id, title: 'X' }, m.sales)).status).toBe(403);
    expect((await m.act({ reply_id: '0190f000-0000-7000-8000-00000000beef', title: 'X' })).status).toBe(404);
    expect((await m.act({ reply_id: id, shortcut: '/gia' })).status).toBe(409);
  });

  it('gọi lặp cùng giá trị → cùng kết quả', async () => {
    const a = await m.act({ reply_id: id, category: 'Lịch' });
    expect((await m.act({ reply_id: id, category: 'Lịch' })).body.data.result).toEqual(a.body.data.result);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
  });
});
