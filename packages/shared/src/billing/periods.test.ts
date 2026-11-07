// TIP-039 (DC-242 / DC-243): kỳ theo ngày đăng ký (31 → cuối tháng ngắn → trở lại 31, năm nhuận), prorate half-up một lần.
import { describe, expect, it } from 'vitest';
import { addMonthsAnchored, anchorOf, monthAt, mulDivHalfUp, periodKey, prorate } from './periods';
import { wallToUtc } from '../time/wall-clock';

const VN = 'Asia/Ho_Chi_Minh';
const at = (d: string, hm = '10:00', tz = VN) => wallToUtc(d, hm, tz);
const day = (x: Date, tz = VN) => periodKey(x, tz);

describe('kỳ theo ngày đăng ký', () => {
  it('31/01/2027 → 28/02/2027 → 31/03/2027 cùng giờ', () => {
    const a = anchorOf(at('2027-01-31'), VN);
    const feb = addMonthsAnchored(at('2027-01-31'), 1, a);
    expect(day(feb)).toBe('2027-02-28');
    expect(feb).toEqual(at('2027-02-28'));
    expect(day(addMonthsAnchored(feb, 1, a))).toBe('2027-03-31');
    expect(day(addMonthsAnchored(at('2027-01-31'), 12, a))).toBe('2028-01-31');
  });

  it('năm nhuận dùng 29/02', () => {
    const a = anchorOf(at('2028-01-30'), VN);
    expect(day(addMonthsAnchored(at('2028-01-30'), 1, a))).toBe('2028-02-29');
  });

  it('monthAt: trước mốc neo trong tháng → kỳ bắt đầu tháng trước', () => {
    const a = anchorOf(at('2027-01-31'), VN);
    const k = monthAt(at('2027-03-30', '23:00'), a);
    expect(day(k.start)).toBe('2027-02-28');
    expect(day(k.end)).toBe('2027-03-31');
    expect(day(monthAt(at('2027-03-31', '10:00'), a).start)).toBe('2027-03-31');
    expect(day(monthAt(at('2027-03-31', '09:59'), a).start)).toBe('2027-02-28');
  });

  it('DST: neo theo giờ tường, kỳ dài 30 ngày ± 1 giờ', () => {
    const tz = 'Europe/Berlin';
    const a = anchorOf(at('2026-10-10', '09:00', tz), tz);
    const end = addMonthsAnchored(at('2026-10-10', '09:00', tz), 1, a);
    expect(end).toEqual(at('2026-11-10', '09:00', tz));
    expect(end.getTime() - at('2026-10-10', '09:00', tz).getTime()).toBe(31 * 86_400_000 + 3_600_000);
  });
});

describe('prorate (DC-243)', () => {
  it('half-up một lần: 10.000 × 10/31 → 3.226; 1 × 1/2 → 1; 1 × 1/3 → 0', () => {
    expect(mulDivHalfUp(10_000n, 10n, 31n)).toBe(3226n);
    expect(mulDivHalfUp(1n, 1n, 2n)).toBe(1n);
    expect(mulDivHalfUp(1n, 1n, 3n)).toBe(0n);
    expect(() => mulDivHalfUp(1n, 1n, 0n)).toThrow();
  });

  it('kỳ 01/04 → 01/05, nâng 16/04 cùng giờ: còn 15/30 → 600.000đ → 300.000đ; 10.000 Credit → 5.000', () => {
    const s = at('2027-04-01');
    const e = at('2027-05-01');
    expect(prorate(600_000n, s, e, at('2027-04-16'))).toBe(300_000n);
    expect(prorate(10_000n, s, e, at('2027-04-16'))).toBe(5_000n);
    expect(prorate(300_000n, s, e, at('2027-04-16'))).toBe(150_000n);
  });

  it('ngoài kỳ kẹp [0, value]; số lớn không mất chính xác', () => {
    const s = at('2027-04-01');
    const e = at('2027-05-01');
    expect(prorate(600_000n, s, e, at('2027-03-01'))).toBe(600_000n);
    expect(prorate(600_000n, s, e, at('2027-06-01'))).toBe(0n);
    expect(prorate(9_007_199_254_740_993n, s, e, at('2027-04-16'))).toBe(4_503_599_627_370_497n);
  });
});
