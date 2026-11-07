// Ma trận business_hours.update (TIP-023b): giờ mở cửa (risk config) → các thứ đổi + bước lưới / đệm / no-show trước / sau; giờ ngược → 422 ở
// preview. 403 cs. Cấu hình workspace — không id. Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('business_hours.update');
  await m.seed('business_hours.update', { days: [0, 1, 2, 3, 4, 5, 6].map((d) => ({ weekday: d, open: d !== 6, start: '08:00', end: '19:00' })), slot_step_min: 30, default_buffer_min: 10 });
}, 120_000);
afterAll(() => m?.close());

describe('business_hours.update', () => {
  it('403 cs (không có booking.config)', async () => {
    expect((await m.act({ days: [0, 1, 2, 3, 4, 5, 6].map((d) => ({ weekday: d, open: d !== 6, start: '08:00', end: '19:00' })) }, m.cs)).status).toBe(403);
  });

  it('preview Trợ lý → xác nhận; giờ ngược → 422', async () => {
    const days = [0, 1, 2, 3, 4, 5, 6].map((d) => ({ weekday: d, open: d !== 6, start: '08:00', end: '19:00' })).map((d) => (d.weekday === 6 ? { ...d, open: true, start: '09:00', end: '12:00' } : d));
    const { preview, done } = await m.confirm({ days, slot_step_min: 15, no_show_deducts: true });
    expect(preview).toEqual({
      summary: '1',
      risk: 'config',
      count: 1,
      changes: [
        { entity: 'business_hours', id: '6', before: { hours: 'closed' }, after: { hours: '09:00-12:00' } },
        { entity: 'booking_setting', id: '1', before: { slot_step_min: 30, no_show_deducts: false }, after: { slot_step_min: 15, no_show_deducts: true } },
      ],
    });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await m.act({ days: days.map((d) => (d.weekday === 0 ? { ...d, start: '19:00', end: '08:00' } : d)) }, undefined, { 'x-action-source': 'assistant' })).body.error.fields).toEqual({ 'days.0': 'from_after_to' });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
