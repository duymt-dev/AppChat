// TIP-036 — toán loyalty (COMMERCE §7): tích theo hạng, ngưỡng hạng, trần 50%, đảo theo tỉ lệ luỹ kế, hạn 12 tháng, đầu quý.
import { describe, expect, it } from 'vitest';
import { DEFAULT_TIERS, earnPoints, expiryOf, maxRedeemPoints, pointsValue, quarterStart, reversalDelta, safePoints, tierFor } from '../src/loyalty/math';

describe('earnPoints', () => {
  it('Vàng: 19.999đ → floor(1 × 1,5) = 1; 20.000đ → 3; dưới 10.000đ → 0', () => {
    expect(earnPoints(19_999n, 'gold').points).toBe(1);
    expect(earnPoints('20000', 'gold')).toEqual({ base: 2, mult: 1.5, points: 3 });
    expect(earnPoints(9_999n, 'diamond').points).toBe(0);
  });
  it('hạng lạ / null → hệ số Thành viên; net âm → 0', () => {
    expect(earnPoints(100_000n, null).points).toBe(10);
    expect(earnPoints(-5n, 'gold').points).toBe(0);
  });
  it('hệ số cấu hình (snapshot) thay mặc định', () => {
    const tiers = DEFAULT_TIERS.map((t) => (t.key === 'gold' ? { ...t, mult: 2.5 } : t));
    expect(earnPoints(100_000n, 'gold', tiers).points).toBe(25);
  });
});

describe('tierFor', () => {
  it('ngưỡng 0 / 5.000 / 15.000 / 40.000', () => {
    expect([0, 4_999, 5_000, 14_999, 15_000, 40_000].map((e) => tierFor(e))).toEqual(['member', 'member', 'silver', 'silver', 'gold', 'diamond']);
  });
});

describe('đổi điểm', () => {
  it('1 điểm = 100đ; đơn 100.000đ → tối đa 500 điểm', () => {
    expect(pointsValue(500)).toBe(50_000n);
    expect(maxRedeemPoints(100_000n)).toBe(500n);
    expect(maxRedeemPoints('100099')).toBe(500n);
  });
});

describe('reversalDelta', () => {
  it('hai lần hoàn một phần cộng lại = đảo theo tỉ lệ luỹ kế, không vượt điểm gốc', () => {
    const first = reversalDelta(15, 30_000n, 100_000n, 0);
    expect(first).toBe(4n);
    const second = reversalDelta(15, 100_000n, 100_000n, first);
    expect(first + second).toBe(15n);
    expect(reversalDelta(15, 200_000n, 100_000n, 15)).toBe(0n);
  });
  it('chưa thu / chưa tích → 0', () => {
    expect(reversalDelta(0, 10n, 10n, 0)).toBe(0n);
    expect(reversalDelta(10, 10n, 0n, 0)).toBe(0n);
  });
});

describe('thời gian', () => {
  it('hạn 12 tháng, đầu quý', () => {
    expect(expiryOf(new Date('2026-03-15T10:00:00Z')).toISOString()).toBe('2027-03-15T10:00:00.000Z');
    expect(['2026-01-01', '2026-03-31', '2026-05-20', '2026-12-31'].map(quarterStart)).toEqual(['2026-01-01', '2026-01-01', '2026-04-01', '2026-10-01']);
  });
  it('điểm ngoài safe integer → lỗi', () => {
    expect(() => safePoints(2n ** 60n)).toThrow('points_out_of_range');
    expect(safePoints(-5n)).toBe(-5);
  });
});
