// TIP-033b §3.2 / §3.4: ngày lịch có thật, giờ 00–23, ngày kế tiếp qua năm, giờ tường không tồn tại / lặp khi đổi giờ, ranh giới ngày
// 23 giờ, lỗi ngày cấu hình (trùng thứ / giờ sai / bắt đầu ≥ kết thúc / thiếu 7 ngày).
import { describe, expect, it } from 'vitest';
import { dayBounds, dayErrors, isCalendarDate, isHm, nextDate, resolveLocal } from './input';

describe('booking input', () => {
  it('ngày / giờ', () => {
    expect([isCalendarDate('2026-02-28'), isCalendarDate('2026-02-30'), isCalendarDate('2028-02-29'), isCalendarDate('2026-13-01')]).toEqual([true, false, true, false]);
    expect([isHm('00:00'), isHm('23:59'), isHm('24:00'), isHm('29:00'), isHm('9:00')]).toEqual([true, true, false, false, false]);
    expect(nextDate('2026-12-31')).toBe('2027-01-01');
  });

  it('giờ tường: VN luôn ok; New York 08/03/2026 02:30 không tồn tại, 01/11/2026 01:30 lặp', () => {
    expect(resolveLocal('2026-11-02', '09:00', 'Asia/Ho_Chi_Minh')).toEqual({ ok: true, at: new Date('2026-11-02T02:00:00Z') });
    expect(resolveLocal('2026-03-08', '02:30', 'America/New_York')).toEqual({ ok: false, reason: 'nonexistent_local_time' });
    expect(resolveLocal('2026-11-01', '01:30', 'America/New_York')).toEqual({ ok: false, reason: 'ambiguous_local_time' });
    expect(resolveLocal('2026-11-01', '03:00', 'America/New_York').ok).toBe(true);
  });

  it('ranh giới ngày theo nửa đêm hôm sau (ngày 23 giờ khi đổi giờ)', () => {
    const b = dayBounds('2026-03-08', 'America/New_York');
    expect(b.end.getTime() - b.start.getTime()).toBe(23 * 3_600_000);
    const v = dayBounds('2026-11-02', 'Asia/Ho_Chi_Minh');
    expect(v.end.getTime() - v.start.getTime()).toBe(24 * 3_600_000);
  });

  it('lỗi ngày cấu hình', () => {
    const d = (weekday: number, open = true, start = '08:00', end = '19:00') => ({ weekday, open, start, end });
    expect(dayErrors([d(0), d(1, false, '19:00', '08:00')], 'schedule')).toEqual({});
    expect(dayErrors([d(0), d(0)], 'schedule')).toEqual({ schedule: 'duplicate_day' });
    expect(dayErrors([d(0, true, '19:00', '08:00')], 'days')).toEqual({ 'days.0': 'from_after_to' });
    expect(dayErrors([d(2, true, '29:00', '30:00')], 'days')).toEqual({ 'days.2': 'invalid_time' });
    expect(dayErrors([d(0)], 'days', true)).toEqual({ days: 'seven_days' });
  });
});
