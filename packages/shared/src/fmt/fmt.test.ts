// fmt.dateTime / fmt.dateParts (TIP-001b §3.3): theo timezone workspace, không theo máy.
import { describe, expect, it } from 'vitest';
import { createFmt } from './index';

describe('fmt', () => {
  const iso = '2026-11-12T18:30:00Z'; // 01:30 ngày 13/11 ở Asia/Ho_Chi_Minh
  it('dateParts theo timezone workspace', () => {
    expect(createFmt({ locale: 'vi' }).dateParts(iso)).toEqual({ d: 13, m: 11, y: 2026 });
    expect(createFmt({ locale: 'en', timeZone: 'UTC' }).dateParts(iso)).toEqual({ d: 12, m: 11, y: 2026 });
  });
  it('dateTime có ngày và giờ theo locale', () => {
    const vi = createFmt({ locale: 'vi' }).dateTime(iso);
    expect(vi).toContain('2026');
    expect(vi).toContain('01:30');
    expect(createFmt({ locale: 'en' }).dateTime(iso)).toMatch(/Nov 13, 2026/);
  });
  it('number theo locale (thay toLocaleString vi-VN rải rác)', () => {
    expect(createFmt({ locale: 'vi' }).number(1250000)).toBe('1.250.000');
    expect(createFmt({ locale: 'en' }).number(1250000)).toBe('1,250,000');
  });
});
