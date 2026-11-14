import { describe, expect, it } from 'vitest';
import { isValidCron, nextCronRun, parseCron } from './cron';

const VN = 'Asia/Ho_Chi_Minh';

describe('cron theo giờ workspace', () => {
  it('cú pháp: *, danh sách, khoảng, bước; sai → null', () => {
    expect(isValidCron('0 8 * * *')).toBe(true);
    expect(isValidCron('*/15 8-17 * * 1-5')).toBe(true);
    expect(isValidCron('0 8,14 1 * 0,7')).toBe(true);
    expect(isValidCron('60 8 * * *')).toBe(false);
    expect(isValidCron('0 8 * *')).toBe(false);
    expect(isValidCron('a b c d e')).toBe(false);
    expect([...parseCron('0 9 * * 7')!.dow.set]).toContain(0);
  });

  it('08:00 mỗi ngày giờ VN: trước 8h → hôm nay, sau 8h → mai', () => {
    expect(nextCronRun('0 8 * * *', new Date('2026-11-02T00:30:00Z'), VN)!.toISOString()).toBe('2026-11-02T01:00:00.000Z');
    expect(nextCronRun('0 8 * * *', new Date('2026-11-02T01:00:00Z'), VN)!.toISOString()).toBe('2026-11-03T01:00:00.000Z');
  });

  it('ngày làm việc (T2–T6): thứ Bảy → thứ Hai; ngày + thứ cùng giới hạn → khớp một trong hai', () => {
    // 2026-11-07 là thứ Bảy.
    expect(nextCronRun('30 9 * * 1-5', new Date('2026-11-07T03:00:00Z'), VN)!.toISOString()).toBe('2026-11-09T02:30:00.000Z');
    // Ngày 1 hoặc thứ Hai: từ 2026-11-03 (thứ Ba) → thứ Hai 2026-11-09 (sớm hơn ngày 1/12).
    expect(nextCronRun('0 8 1 * 1', new Date('2026-11-03T03:00:00Z'), VN)!.toISOString()).toBe('2026-11-09T01:00:00.000Z');
  });

  it('múi giờ khác + không có ngày khớp → null', () => {
    expect(nextCronRun('0 8 * * *', new Date('2026-11-02T00:00:00Z'), 'UTC')!.toISOString()).toBe('2026-11-02T08:00:00.000Z');
    expect(nextCronRun('0 8 31 2 *', new Date('2026-11-02T00:00:00Z'), VN)).toBeNull();
    expect(nextCronRun('bad', new Date(), VN)).toBeNull();
  });
});
