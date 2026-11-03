// Ma trận working_hours.update (TIP-023b): giờ làm việc SLA (risk config, db platform) → các ngày đổi + tạm dừng SLA trước / sau; giờ ngược → 422
// ở preview. 403 sales (không có settings.manage). Cấu hình workspace — không id. Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('working_hours.update');
}, 120_000);
afterAll(() => m?.close());

describe('working_hours.update', () => {
  // Mặc định DEFAULT_WORKING_DAYS: Thứ Hai–Thứ Sáu 08:00–18:00, Thứ Bảy 08:00–12:00, Chủ nhật nghỉ — chỉ Thứ Bảy đổi.
  const days = [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, on: day < 6, from: '08:00', to: day === 5 ? '12:00' : '18:00' }));

  it('403 sales', async () => {
    expect((await m.act({ days, pause_sla: true }, m.sales)).status).toBe(403);
  });

  it('preview Trợ lý → xác nhận; giờ ngược → 422', async () => {
    const next = days.map((d) => (d.day === 5 ? { ...d, to: '15:00' } : d));
    const { preview, done } = await m.confirm({ days: next, pause_sla: false });
    expect(preview).toEqual({
      summary: '2',
      risk: 'config',
      count: 2,
      changes: [
        { entity: 'working_hours', id: '5', before: { hours: '08:00-12:00' }, after: { hours: '08:00-15:00' } },
        { entity: 'working_hours', id: 'pause_sla', before: { pause_sla: true }, after: { pause_sla: false } },
      ],
    });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await m.act({ days: next.map((d) => (d.day === 0 ? { ...d, from: '18:00', to: '08:00' } : d)), pause_sla: true }, undefined, { 'x-action-source': 'assistant' })).body.error.fields).toEqual({ 'days.0': 'from_after_to' });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
