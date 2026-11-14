// TIP-028 (unit): mẫu Word của DN — kiểm gói (macro / không phải docx), đọc đoạn, gắn thẻ theo vị trí đã xác nhận + điền biến
// (docxtemplater), chèn dòng "không thay thế hoá đơn GTGT"; AI nhận diện (parse JSON model + bộ luật dự phòng); render mẫu rich;
// dữ liệu minh hoạ. Tệp mẫu: test/fixtures/documents (LibreOffice từ HTML).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import PizZip from 'pizzip';
import { describe, expect, it } from 'vitest';
import { AppError, htmlPage, renderRich, sanitizeTemplateHtml } from '@appchat/shared';
import { detectByRules, docxParagraphs, fillDocx, openDocx, parseDetected, sampleData, tagDocx } from '../src';

const fx = (n: string) => readFileSync(join(import.meta.dirname, 'fixtures', 'documents', n));
const now = new Date('2026-10-30T03:00:00.000Z');
const biz = { legal_name: 'Spa Hoa Sen', tax_code: '0301234567', address: 'Q1', representative: 'Trâm', logo: '', bank_account: '' };
const data = () => sampleData('contract', biz, { locale: 'vi', timeZone: 'Asia/Ho_Chi_Minh', now, owner: 'Trâm' });

describe('docx', () => {
  it('đọc đoạn văn; từ chối tệp không phải docx / có macro', () => {
    const paras = docxParagraphs(openDocx(fx('hop-dong-spa.docx')));
    expect(paras).toContain('HỢP ĐỒNG DỊCH VỤ SPA');
    expect(paras.find((p) => p.startsWith('BÊN B:'))).toMatch(/…/);
    expect(() => openDocx(Buffer.from('xin chao'))).toThrow(AppError);
    const z = new PizZip(fx('hop-dong-spa.docx'));
    z.file('word/vbaProject.bin', 'x');
    try {
      openDocx(z.generate({ type: 'nodebuffer' }));
      expect.unreachable();
    } catch (e) {
      expect((e as AppError).fields).toEqual({ file: 'macro' });
    }
  });

  it('gắn thẻ vào chỗ trống + điền dữ liệu; vị trí không có trong tệp bị bỏ qua', () => {
    const zip = openDocx(fx('hop-dong-spa.docx'));
    const paras = docxParagraphs(zip);
    const ph = (start: string) => paras.find((p) => p.startsWith(start))!;
    const hit = tagDocx(zip, [
      { placeholder: ph('BÊN A:'), variable: 'business.legal_name' },
      { placeholder: ph('BÊN B:'), variable: 'customer.name' },
      { placeholder: ph('Giá trị hợp đồng:'), variable: 'contract.value' },
      { placeholder: 'Không có dòng này', variable: 'doc.code' },
    ]);
    expect(hit).toBe(3);
    const out = docxParagraphs(openDocx(fillDocx(zip, data() as never)));
    expect(out).toContain('BÊN A: Spa Hoa Sen');
    expect(out).toContain('BÊN B: Công ty TNHH Khách Hàng Mẫu');
    expect(out.find((p) => p.startsWith('Giá trị hợp đồng:'))).toMatch(/^Giá trị hợp đồng: [\d.]+₫ đồng$/);
    // Điều khoản của DN giữ nguyên văn.
    expect(out).toContain('Điều 6. Mọi tranh chấp được giải quyết tại Toà án có thẩm quyền.');
  });
});

describe('nhận diện biến', () => {
  const paras = docxParagraphs(openDocx(fx('hop-dong-spa.docx')));

  it('bộ luật: nhãn quen + chỗ trống → biến đúng loại', () => {
    const f = detectByRules('contract', paras);
    const by = Object.fromEntries(f.map((x) => [x.variable, x.placeholder]));
    expect(Object.keys(by)).toEqual(expect.arrayContaining(['doc.code', 'business.legal_name', 'customer.name', 'customer.tax_code', 'contract.value', 'totals.total_words', 'contract.start']));
    expect(by['customer.name']).toMatch(/^BÊN B:/);
    // Phiếu thu không có biến hợp đồng.
    expect(detectByRules('receipt', paras).some((x) => x.variable.startsWith('contract.'))).toBe(false);
  });

  it('JSON model: bỏ vị trí bịa / biến lạ / trùng; sai định dạng → null', () => {
    const bên = paras.find((p) => p.startsWith('BÊN B:'))!;
    const r = parseDetected('contract', paras, `Đây: {"fields":[{"placeholder":"${bên}","variable":"customer.name","confidence":0.93},{"placeholder":"${bên}","variable":"customer.phone","confidence":0.5},{"placeholder":"Dòng bịa","variable":"doc.code","confidence":0.9},{"placeholder":"Số:","variable":"payment.vietqr","confidence":0.9}]}`);
    expect(r).toEqual([{ placeholder: bên, variable: 'customer.name', confidence: 0.93 }]);
    expect(parseDetected('contract', paras, 'không phải JSON')).toBeNull();
  });
});

describe('render rich', () => {
  it('vòng items + biến chung, escape HTML, tự chèn dòng không thay thế HĐ GTGT ở phiếu thu', () => {
    const d = data();
    d.customer.name = '<b>Hoa</b>';
    const html = renderRich('receipt', '<p>{{customer.name}}</p>{{#items}}<i>{{no}}-{{name}}-{{doc.code}}</i>{{/items}}<p>{{totals.total_words}}</p>', d, 'Chứng từ này không thay thế hoá đơn giá trị gia tăng.');
    expect(html).toContain('&lt;b&gt;Hoa&lt;/b&gt;');
    expect(html).toContain('<i>1-Liệu trình chăm sóc da 10 buổi-HD-0001</i><i>2-Serum phục hồi B5-HD-0001</i>');
    expect(html).toMatch(/Bảy triệu .* đồng/);
    expect(html.endsWith('<p>Chứng từ này không thay thế hoá đơn giá trị gia tăng.</p>')).toBe(true);
    expect(htmlPage('A', html)).toMatch(/^<!doctype html>/);
  });

  it('dữ liệu minh hoạ: tiền theo quoteTotals (CK dòng 10%, VAT 8%)', () => {
    const d = data();
    expect(d.items.map((i) => i.amount)).toEqual(['5.850.000₫', '1.360.000₫']);
    expect(d.totals).toMatchObject({ subtotal: '7.860.000₫', vat: '576.800₫', total: '7.786.800₫' });
    expect(d.doc.valid_until).toBe('14/11/2026');
  });

  it('làm sạch HTML mẫu: bỏ script / on* / link ra ngoài, giữ ảnh data:', () => {
    const s = sanitizeTemplateHtml('<p onclick="x()">A</p><script>alert(1)</script><img src="http://evil/x.png"><img src="data:image/png;base64,AA"><a href="https://x">l</a>');
    expect(s).toBe('<p>A</p><img><img src="data:image/png;base64,AA"><a>l</a>');
  });
});
