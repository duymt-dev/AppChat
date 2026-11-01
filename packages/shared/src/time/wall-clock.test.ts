import { describe, expect, it } from 'vitest';
import { utcToWall, wallToUtc, weekdayOf } from './wall-clock';

describe('giờ tường ↔ UTC', () => {
  it('Asia/Ho_Chi_Minh (+07)', () => {
    const d = wallToUtc('2026-11-05', '09:30', 'Asia/Ho_Chi_Minh');
    expect(d.toISOString()).toBe('2026-11-05T02:30:00.000Z');
    expect(utcToWall(d, 'Asia/Ho_Chi_Minh')).toEqual({ date: '2026-11-05', hm: '09:30', weekday: 3, iso: '2026-11-05T09:30:00+07:00' });
  });
  it('múi có giờ mùa hè (Europe/Berlin) + qua nửa đêm', () => {
    expect(wallToUtc('2026-07-01', '10:00', 'Europe/Berlin').toISOString()).toBe('2026-07-01T08:00:00.000Z');
    expect(wallToUtc('2026-12-01', '10:00', 'Europe/Berlin').toISOString()).toBe('2026-12-01T09:00:00.000Z');
    expect(utcToWall(new Date('2026-11-05T18:00:00Z'), 'Asia/Ho_Chi_Minh').date).toBe('2026-11-06');
  });
  it('thứ: 0 = Thứ Hai', () => {
    expect(weekdayOf('2026-11-02')).toBe(0);
    expect(weekdayOf('2026-11-08')).toBe(6);
  });
});
