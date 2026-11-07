import { describe, expect, it } from 'vitest';
import { catalogItem, contentMatches, findInvoiceRef, invoiceCode, platformTransferCode } from './payments';
import { transferContent } from '../commerce/vietqr';

describe('hoá đơn gói — mã, nội dung chuyển khoản, khớp', () => {
  it('mã INV + nội dung ≤ 25 ký tự, không bị ngân hàng cắt', () => {
    const code = invoiceCode(2026, 1001);
    expect(code).toBe('INV-2026-1001');
    const tc = platformTransferCode(code);
    expect(tc).toBe('APPCHAT INV20261001');
    expect(transferContent(tc)).toBe(tc);
    expect(platformTransferCode(invoiceCode(2026, 123456789)).length).toBeLessThanOrEqual(25);
  });

  it('khớp bỏ khoảng trắng / gạch, không phân biệt hoa thường', () => {
    expect(contentMatches('MBVCB.123.APPCHAT INV2026 1001.CT tu 0123', 'APPCHAT INV20261001')).toBe(true);
    expect(contentMatches('appchat-inv20261001', 'APPCHAT INV20261001')).toBe(true);
    expect(contentMatches('APPCHAT INV20261002', 'APPCHAT INV20261001')).toBe(false);
    expect(findInvoiceRef('chuyen tien APPCHAT INV2026 1001 ok')).toBe('INV-2026-1001');
    expect(findInvoiceRef('khong co ma')).toBeNull();
  });

  it('mặt hàng credit / addon theo catalog', () => {
    expect(catalogItem('credit', 'credit_1000')).toMatchObject({ amount: 1_000_000n, credits: 1050 });
    expect(catalogItem('addon', 'addon_user')).toMatchObject({ amount: 150_000n, desc: 'addon_user' });
    expect(catalogItem('credit', 'nope')).toBeNull();
  });
});
