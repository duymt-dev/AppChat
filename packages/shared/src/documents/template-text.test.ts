import { describe, expect, it } from 'vitest';
import { hasNotVatLine, htmlText, legalChecklist, templateVars } from './template-text';
import { vndWords } from './vnd-words';

describe('documents/template-text', () => {
  it('trích biến; cột dòng hàng chỉ hợp lệ trong vòng items', () => {
    const body = '<p>{{customer.name}}</p>{{#items}}<tr><td>{{name}}</td><td>{{ qty }}</td></tr>{{/items}}<p>{{totals.total}}</p>';
    expect(templateVars('quote', body)).toEqual({ vars: ['customer.name', 'items', 'totals.total'], unknown: [] });
    expect(templateVars('quote', '{{name}} {{contract.value}}').unknown).toEqual(['name', 'contract.value']);
    expect(templateVars('quote', '{{#items}}{{name}}').unknown).toEqual(['items']);
    expect(templateVars('receipt', '{{#items}}{{/items}}').unknown).toEqual(['items']);
    expect(templateVars('quote', '{{#foo}}{{/foo}}').unknown).toEqual(['foo']);
  });

  it('bảng kiểm theo biến + nội dung không dấu', () => {
    const quote = legalChecklist('quote', 'Báo giá có hiệu lực 15 ngày, chưa gồm VAT', ['business.tax_code']);
    expect(quote).toEqual([
      { key: 'seller_tax', ok: true },
      { key: 'date', ok: false },
      { key: 'validity', ok: true },
      { key: 'vat_note', ok: true },
    ]);
    const c = legalChecklist('contract', htmlText('<p>BÊN A … BÊN B</p><p>Giải quyết tranh chấp tại toà</p>'), []);
    expect(c.filter((x) => x.ok).map((x) => x.key)).toEqual(['parties', 'dispute']);
    expect(legalChecklist('receipt', '', [])).toEqual([{ key: 'not_vat', ok: true }]);
  });

  it('dòng không thay thế hoá đơn GTGT', () => {
    expect(hasNotVatLine('receipt', 'Chứng từ này không thay thế hoá đơn giá trị gia tăng.')).toBe(true);
    expect(hasNotVatLine('receipt', 'Phiếu thu')).toBe(false);
    expect(hasNotVatLine('quote', '')).toBe(true);
  });

  it('số tiền bằng chữ', () => {
    expect(vndWords('1250000')).toBe('Một triệu hai trăm năm mươi nghìn đồng');
    expect(vndWords(21_000_105)).toBe('Hai mươi mốt triệu một trăm linh năm đồng');
    expect(vndWords(15)).toBe('Mười lăm đồng');
    expect(vndWords(1_004_000)).toBe('Một triệu không trăm linh bốn nghìn đồng');
    expect(vndWords(0)).toBe('Không đồng');
    expect(vndWords(1_250_000, 'en')).toBe('One million two hundred fifty thousand dong');
  });
});
