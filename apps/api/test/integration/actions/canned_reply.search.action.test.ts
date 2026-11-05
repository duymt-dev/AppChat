// Ma trận canned_reply.search (TIP-023b R2): happy (theo phím tắt / tiêu đề, bỏ dấu, có nội dung) · 403 (kế toán không có inbox.reply) ·
// sales đọc được (trả lời nhanh dùng chung, không có data scope) · nguồn assistant. Idempotency / undo / trạng thái: không áp dụng.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let hours: string;

beforeAll(async () => {
  m = await matrix('canned_reply.search');
  hours = (await m.seed('canned_reply.create', { shortcut: '/gio', title: 'Giờ mở cửa', body: 'Spa mở cửa 8h–20h mỗi ngày.', category: 'Chung' })).reply_id;
  await m.seed('canned_reply.create', { shortcut: '/gia', title: 'Bảng giá', body: 'Gửi chị bảng giá…', category: 'Bán hàng' });
}, 120_000);
afterAll(() => m?.close());

describe('canned_reply.search', () => {
  it('happy: bỏ dấu, theo tiêu đề hoặc phím tắt, trả nội dung', async () => {
    const r = await m.act({ q: 'gio mo cua' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result.replies).toEqual([{ id: hours, shortcut: '/gio', title: 'Giờ mở cửa', body: 'Spa mở cửa 8h–20h mỗi ngày.', category: 'Chung' }]);
    expect((await m.act({ q: '/gia' })).body.data.result.replies.map((x: { shortcut: string }) => x.shortcut)).toEqual(['/gia']);
  });

  it('403: kế toán; sales đọc được', async () => {
    expect((await m.act({}, await m.h.member('accountant'))).status).toBe(403);
    expect((await m.act({}, m.sales)).body.data.result.replies).toHaveLength(2);
  });

  it('nguồn assistant · limit > 20 bị từ chối', async () => {
    expect((await m.act({}, undefined, { 'x-action-source': 'assistant' })).status).toBe(200);
    expect((await m.act({ limit: 21 })).status).toBe(422);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
  });
});
