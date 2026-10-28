import { describe, expect, it } from 'vitest';
import { findSlots, toHm, toMin } from './slots';

const base = { open: { start: '08:00', end: '12:00' }, duration: 60, buffer: 10, staff_ids: ['s1', 's2'] };

describe('findSlots (appointment.find_slots)', () => {
  it('chuyển đổi giờ', () => {
    expect(toMin('09:30')).toBe(570);
    expect(toHm(570)).toBe('09:30');
  });

  it('lưới 30 phút trong giờ mở cửa, không vượt giờ đóng', () => {
    const s = findSlots({ ...base, busy: [] });
    expect(s.map((x) => x.start)).toEqual(['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00']);
    expect(s.at(-1)!.end).toBe('12:00');
  });

  it('loại nhân sự bận, tính cả buffer hai phía', () => {
    const s = findSlots({ ...base, busy: [{ staff_id: 's1', start: '09:00', end: '10:00' }] });
    const at = (hm: string) => s.find((x) => x.start === hm)!.staff_ids;
    expect(at('08:00')).toEqual(['s2']); // 08:00–09:00 + 10′ buffer chạm 09:00
    expect(at('10:00')).toEqual(['s2']); // buffer sau 10:00 → 10:10
    expect(at('10:30')).toEqual(['s1', 's2']);
  });

  it('bỏ slot khi mọi nhân sự đều bận, và slot trước not_before', () => {
    const busy = ['s1', 's2'].map((id) => ({ staff_id: id, start: '08:00', end: '10:00' }));
    const s = findSlots({ ...base, busy, not_before: '10:05' });
    expect(s[0]!.start).toBe('10:30');
  });
});
