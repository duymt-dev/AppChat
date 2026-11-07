import { describe, expect, it } from 'vitest';
import { nextState } from '../state/flow';
import { INVOICE_FLOW, findInvoiceCode, invoiceStatusOf, invoiceTransferCode, matchBankTx, packageRefundOf } from './invoice-state';

const st = (status: Parameters<typeof invoiceStatusOf>[0]['status'], paid: number, due = '2026-11-08', today = '2026-11-01') =>
  invoiceStatusOf({ status, amount: 1_000_000, paid, due, today });

describe('INVOICE_FLOW', () => {
  it('gửi: nháp → đã gửi; nhắc lại giữ trạng thái; huỷ chỉ từ nháp / đã gửi', () => {
    expect(nextState(INVOICE_FLOW, 'draft', 'invoice.send_payment_qr')).toBe('sent');
    expect(nextState(INVOICE_FLOW, 'overdue', 'invoice.send_payment_qr')).toBe('overdue');
    expect(nextState(INVOICE_FLOW, 'draft', 'invoice.void')).toBe('void');
    expect(nextState(INVOICE_FLOW, 'partial', 'invoice.void')).toBeNull();
    expect(nextState(INVOICE_FLOW, 'paid', 'invoice.send_payment_qr')).toBeNull();
    expect(nextState(INVOICE_FLOW, 'void', 'invoice.send_payment_qr')).toBeNull();
  });
});

describe('invoiceStatusOf', () => {
  it('suy ra từ số đã thu + hạn', () => {
    expect(st('draft', 0)).toBe('draft');
    expect(st('draft', 200_000)).toBe('partial');
    expect(st('sent', 0)).toBe('sent');
    expect(st('sent', 1_000_000)).toBe('paid');
    expect(st('partial', 0)).toBe('sent');
    expect(st('sent', 0, '2026-10-31')).toBe('overdue');
    expect(st('overdue', 300_000, '2026-10-31')).toBe('overdue');
    expect(st('void', 0)).toBe('void');
  });
});

describe('khớp chuyển khoản', () => {
  it('mã TT trong nội dung (có / không gạch, khoảng trắng, chữ thường)', () => {
    expect(invoiceTransferCode('TT-002041')).toBe('TT002041');
    expect(findInvoiceCode('CK TT002041 chi Lan')).toBe('TT-002041');
    expect(findInvoiceCode('tt-002041')).toBe('TT-002041');
    expect(findInvoiceCode('Thanh toan TT 001001 0909123456')).toBe('TT-001001');
    expect(findInvoiceCode('CK MAI ANH GOI CHAM SOC')).toBeNull();
    expect(findInvoiceCode('TT12345')).toBeNull();
  });

  it('khớp chắc chỉ khi đúng mã + còn mở + đúng số còn phải thu', () => {
    const inv = { code: 'TT-001001', status: 'sent' as const, left: 500_000n };
    expect(matchBankTx('TT001001', 500_000n, inv)).toEqual({ kind: 'match', code: 'TT-001001' });
    expect(matchBankTx('TT001001', 400_000n, inv)).toMatchObject({ kind: 'review', reason: 'amount_mismatch' });
    expect(matchBankTx('TT001001', 500_000n, { ...inv, status: 'paid' })).toMatchObject({ kind: 'review', reason: 'invoice_closed' });
    expect(matchBankTx('CK khong ma', 500_000n, null)).toMatchObject({ kind: 'review', reason: 'missing_code', code: null });
    expect(matchBankTx('TT009999', 500_000n, null)).toMatchObject({ kind: 'review', reason: 'missing_code', code: 'TT-009999' });
  });
});

describe('packageRefundOf', () => {
  it('theo tỉ lệ buổi còn lại, làm tròn xuống', () => {
    expect(packageRefundOf(10_000_000n, 10, 3)).toBe(7_000_000n);
    expect(packageRefundOf(1_000_000n, 3, 1)).toBe(666_666n);
    expect(packageRefundOf(1_000_000n, 3, 3)).toBe(0n);
  });
});
