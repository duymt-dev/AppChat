import { describe, expect, it } from 'vitest';
import { approvalReasons, quoteTotals } from './quote-math';

describe('quoteTotals (COMMERCE §3)', () => {
  it('thuế tính sau chiết khấu dòng + chiết khấu tổng', () => {
    const t = quoteTotals(
      [
        { qty: 8, unit_price: '1500000', tax_rate: 8 },
        { qty: 2, unit_price: '400000', tax_rate: 8, discount: { kind: 'amount', value: '100000' } },
      ],
      { kind: 'pct', value: 5 },
    );
    expect(t.subtotal).toBe('12800000');
    expect(t.line_discount_total).toBe('100000');
    expect(t.header_discount_total).toBe('635000');
    expect(t.tax_total).toBe('965200');
    expect(t.total).toBe('13030200');
  });

  it('thuế suất theo từng dòng', () => {
    const t = quoteTotals([
      { qty: 1, unit_price: '1000000', tax_rate: 10 },
      { qty: 1, unit_price: '1000000', tax_rate: 0 },
    ]);
    expect(t.tax_total).toBe('100000');
    expect(t.total).toBe('2100000');
  });

  it('chiết khấu không vượt giá trị dòng', () => {
    const t = quoteTotals([
      { qty: 1, unit_price: '500000', tax_rate: 8, discount: { kind: 'amount', value: '900000' } },
    ]);
    expect(t.total).toBe('0');
  });

  it('ngưỡng duyệt: tổng > 20tr hoặc giảm > 5%', () => {
    expect(approvalReasons(quoteTotals([{ qty: 1, unit_price: '22000000', tax_rate: 8 }]))).toEqual([
      'total',
    ]);
    expect(
      approvalReasons(
        quoteTotals([{ qty: 1, unit_price: '1000000', tax_rate: 8 }], { kind: 'pct', value: 10 }),
      ),
    ).toEqual(['discount']);
    expect(
      approvalReasons(
        quoteTotals([{ qty: 1, unit_price: '1000000', tax_rate: 8 }], { kind: 'pct', value: 5 }),
      ),
    ).toEqual([]);
    expect(
      approvalReasons(quoteTotals([{ qty: 1, unit_price: '100', tax_rate: 0 }]), { offCatalog: true }),
    ).toEqual(['off_catalog']);
  });
});
