// Ma trận booking.settings_get (TIP-033b §1.3): happy (giờ mở cửa 7 thứ, version, nhân sự tri-state) · trang nhân sự (staff_limit +
// staff_next_cursor, không trùng / sót) · cursor hỏng → 422 · 403 cs (không có booking.config) · nguồn assistant chạy ngay. Không cấp cho
// agent (agentGrantable=false). Idempotency / undo / trạng thái: không áp dụng (risk read).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
const ids: string[] = [];

beforeAll(async () => {
  m = await matrix('booking.settings_get');
  await m.seed('business_hours.update', { days: [0, 1, 2, 3, 4, 5, 6].map((d) => ({ weekday: d, open: d !== 6, start: '08:00', end: '19:00' })), slot_step_min: 30, default_buffer_min: 10 });
  ids.push((await m.seed('staff.create', { name: 'KTV. Một', schedule: [{ weekday: 1, open: false, start: '08:00', end: '19:00' }] })).staff_id);
  for (const n of ['Hai', 'Ba', 'Bốn']) ids.push((await m.seed('staff.create', { name: `KTV. ${n}` })).staff_id);
}, 120_000);
afterAll(() => m?.close());

describe('booking.settings_get', () => {
  it('happy: 7 thứ + version + ca riêng tri-state', async () => {
    const r = await m.act({});
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const d = r.body.data.result;
    expect([d.days.length, d.slot_step_min, d.version >= 1]).toEqual([7, 30, true]);
    expect(d.staff.find((s: { id: string }) => s.id === ids[0]).schedule).toEqual([{ weekday: 1, open: false, start: '08:00', end: '19:00' }]);
  });

  it('trang nhân sự: limit 3 → cursor → phần còn lại, không trùng / sót; cursor hỏng → 422', async () => {
    const p1 = (await m.act({ staff_limit: 3 })).body.data.result;
    expect(p1.staff).toHaveLength(3);
    expect(p1.staff_next_cursor).toEqual(expect.any(String));
    const p2 = (await m.act({ staff_limit: 3, staff_cursor: p1.staff_next_cursor })).body.data.result;
    const all = [...p1.staff, ...p2.staff].map((s: { id: string }) => s.id);
    expect(new Set(all).size).toBe(all.length);
    expect(all).toEqual(expect.arrayContaining(ids));
    expect(p2.staff_next_cursor).toBeNull();
    expect((await m.act({ staff_cursor: 'hong' })).status).toBe(422);
  });

  it('403: cs không có booking.config', async () => {
    expect((await m.act({}, m.cs)).status).toBe(403);
  });

  it('nguồn assistant: chạy ngay; không cấp cho agent', async () => {
    expect((await m.act({}, undefined, { 'x-action-source': 'assistant' })).status).toBe(200);
    expect(m.def.agentGrantable).toBe(false);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
  });
});
