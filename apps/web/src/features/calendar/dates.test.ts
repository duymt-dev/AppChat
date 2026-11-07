import { describe, expect, it } from 'vitest';
import { addDays, addMonths, daysInMonth, dowMon, rangeOf, weekStart } from './dates';

describe('calendar dates', () => {
  it('24/06/2026 là Thứ 4, tuần bắt đầu 22/06', () => {
    expect(dowMon('2026-06-24')).toBe(2);
    expect(weekStart('2026-06-24')).toBe('2026-06-22');
    expect(addDays('2026-06-30', 1)).toBe('2026-07-01');
  });
  it('tháng: số ngày, chuyển tháng, khoảng tải', () => {
    expect(daysInMonth('2026-06-10')).toBe(30);
    expect(addMonths('2026-12-05', 1)).toBe('2027-01-01');
    expect(rangeOf('month', '2026-06-24')).toEqual(['2026-06-01', '2026-06-30']);
    expect(rangeOf('week', '2026-06-24')).toEqual(['2026-06-22', '2026-06-28']);
    expect(rangeOf('day', '2026-06-24')).toEqual(['2026-06-24', '2026-06-24']);
  });
});
