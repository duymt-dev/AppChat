import { describe, expect, it } from 'vitest';
import { dayEndAfter, daysLeft } from './deadline';

describe('time/deadline', () => {
  it('cuối ngày (mốc + N) theo giờ workspace', () => {
    // 01/07 10:00 giờ VN (03:00Z) + 15 ngày → 16/07 23:59:59.999 VN = 16:59:59.999Z.
    expect(dayEndAfter(new Date('2026-07-01T03:00:00Z'), 15, 'Asia/Ho_Chi_Minh').toISOString()).toBe('2026-07-16T16:59:59.999Z');
    // 23:30 VN ngày 01/07 (16:30Z) vẫn là ngày 01/07.
    expect(dayEndAfter(new Date('2026-07-01T16:30:00Z'), 1, 'Asia/Ho_Chi_Minh').toISOString()).toBe('2026-07-02T16:59:59.999Z');
    // Múi giờ có giờ mùa hè.
    expect(dayEndAfter(new Date('2026-03-07T12:00:00Z'), 2, 'America/New_York').toISOString()).toBe('2026-03-10T03:59:59.999Z');
  });

  it('số ngày còn lại theo ngày lịch', () => {
    const end = dayEndAfter(new Date('2026-07-01T03:00:00Z'), 15, 'Asia/Ho_Chi_Minh');
    expect(daysLeft(new Date('2026-07-14T03:00:00Z'), end, 'Asia/Ho_Chi_Minh')).toBe(2);
    expect(daysLeft(new Date('2026-07-16T16:00:00Z'), end, 'Asia/Ho_Chi_Minh')).toBe(0);
    expect(daysLeft(new Date('2026-07-16T17:30:00Z'), end, 'Asia/Ho_Chi_Minh')).toBe(-1);
  });
});
