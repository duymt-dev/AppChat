import { describe, expect, it } from 'vitest';
import { DEFAULT_WORKING_DAYS } from '../support/sla-defaults';
import { addBusinessMinutes, businessMinutesBetween, nextMorningSnoozeUtc, type BusinessCalendar } from './business-time';

// T2–T6 08:00–18:00, T7 08:00–12:00, CN nghỉ — giờ VN (UTC+7).
const cal: BusinessCalendar = { days: DEFAULT_WORKING_DAYS, timeZone: 'Asia/Ho_Chi_Minh', enabled: true };
const vn = (s: string) => new Date(`${s}+07:00`);

describe('businessTime', () => {
  it('trong giờ làm: cộng thẳng', () => {
    expect(addBusinessMinutes(vn('2026-10-28T09:00:00'), 240, cal).toISOString()).toBe(vn('2026-10-28T13:00:00').toISOString());
  });

  it('vắt qua cuối ngày → sáng hôm sau; trước giờ mở → tính từ 08:00', () => {
    expect(addBusinessMinutes(vn('2026-10-28T17:00:00'), 240, cal).toISOString()).toBe(vn('2026-10-29T11:00:00').toISOString());
    expect(addBusinessMinutes(vn('2026-10-28T06:00:00'), 10, cal).toISOString()).toBe(vn('2026-10-28T08:10:00').toISOString());
  });

  it('thứ Bảy nửa ngày + Chủ nhật nghỉ → thứ Hai', () => {
    // T7 31/10 11:00 → còn 60′ tới 12:00, 180′ sang T2 02/11 08:00 → 11:00.
    expect(addBusinessMinutes(vn('2026-10-31T11:00:00'), 240, cal).toISOString()).toBe(vn('2026-11-02T11:00:00').toISOString());
  });

  it('phút làm việc giữa hai mốc (bỏ đêm + Chủ nhật)', () => {
    expect(businessMinutesBetween(vn('2026-10-28T17:00:00'), vn('2026-10-29T09:00:00'), cal)).toBe(120);
    expect(businessMinutesBetween(vn('2026-10-31T11:00:00'), vn('2026-11-02T08:30:00'), cal)).toBe(90);
    expect(businessMinutesBetween(vn('2026-10-29T09:00:00'), vn('2026-10-28T09:00:00'), cal)).toBe(0);
  });

  it('tắt tạm dừng ngoài giờ / không ngày làm nào → giờ tuyệt đối', () => {
    const off = { ...cal, enabled: false };
    expect(addBusinessMinutes(vn('2026-10-28T17:00:00'), 240, off).toISOString()).toBe(vn('2026-10-28T21:00:00').toISOString());
    expect(businessMinutesBetween(vn('2026-10-28T17:00:00'), vn('2026-10-29T09:00:00'), { ...cal, days: [] })).toBe(960);
  });

  it('tạm ẩn "Sáng mai" (nextMorningSnoozeUtc): 21:00 → 08:00 ngày làm việc kế tiếp theo múi giờ workspace', () => {
    // T4 28/10 21:00 GMT+7 → T5 29/10 08:00 GMT+7 (= 01:00Z).
    expect(nextMorningSnoozeUtc(vn('2026-10-28T21:00:00'), cal).toISOString()).toBe(vn('2026-10-29T08:00:00').toISOString());
    // T7 31/10 21:00 GMT+7 → CN nghỉ → T2 02/11 08:00 GMT+7.
    expect(nextMorningSnoozeUtc(vn('2026-10-31T21:00:00'), cal).toISOString()).toBe(vn('2026-11-02T08:00:00').toISOString());
    // Múi giờ UTC + giờ mở cửa tuỳ chỉnh 09:30.
    const custom = {
      enabled: true,
      timeZone: 'UTC',
      days: cal.days.map((d) => ({ ...d, from: '09:30' })),
    };
    expect(nextMorningSnoozeUtc(new Date('2026-10-28T21:00:00.000Z'), custom).toISOString()).toBe('2026-10-29T09:30:00.000Z');
    // Tắt tạm dừng ngoài giờ → luôn chọn ngày mai 08:00.
    expect(nextMorningSnoozeUtc(vn('2026-10-31T21:00:00'), { ...cal, enabled: false }).toISOString()).toBe(vn('2026-11-01T08:00:00').toISOString());
  });
});
