import { describe, expect, it } from 'vitest';
import { DOC_KINDS, LEGAL_CHECKLIST, validateTemplateVars, varsForKind } from './variables';

describe('documents/variables', () => {
  it('mọi loại chứng từ có biến business / customer / doc / totals', () => {
    for (const k of DOC_KINDS) {
      const keys = varsForKind(k).map((v) => v.key);
      expect(keys).toContain('business.legal_name');
      expect(keys).toContain('customer.name');
      expect(keys).toContain('doc.code');
      expect(keys).toContain('totals.total');
    }
  });

  it('biến hợp đồng chỉ dùng cho hợp đồng; bảng hàng không có trên phiếu thu', () => {
    expect(validateTemplateVars('contract', ['contract.value', 'items'])).toEqual([]);
    expect(validateTemplateVars('quote', ['contract.value'])).toEqual(['contract.value']);
    expect(validateTemplateVars('receipt', ['items'])).toEqual(['items']);
  });

  it('biến lạ bị trả về để báo lỗi khi lưu', () => {
    expect(validateTemplateVars('quote', ['customer.name', 'customer.nickname'])).toEqual(['customer.nickname']);
  });

  it('bảng kiểm: hợp đồng theo Điều 398 (9 mục), đề nghị thanh toán / phiếu thu có dòng không thay thế HĐ GTGT', () => {
    expect(LEGAL_CHECKLIST.contract).toHaveLength(9);
    expect(LEGAL_CHECKLIST.payment_request).toContain('not_vat');
    expect(LEGAL_CHECKLIST.receipt).toContain('not_vat');
  });
});
