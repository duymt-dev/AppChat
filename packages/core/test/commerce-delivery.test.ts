// TIP-032b P2 (unit): VietQR ảnh thật decode đúng payload (tài khoản / số tiền / nội dung CK — EMVCo/NAPAS); không có tài khoản / đã thu đủ →
// không bịa QR; mẫu rich chèn ảnh đúng chỗ `{{payment.vietqr}}` (thiếu biến → khối cuối), chỉ nhận data:image/png; token link công khai
// miền "doc:" — token ký của miền khác / sửa một ký tự bị từ chối; che token khi ghi log.
import { describe, expect, it } from 'vitest';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import { renderRich, vietQrPayload, type DocData } from '@appchat/shared';
import { invoiceQrOf, pngDataUri, qrPng } from '../src/sales/payments/services/invoice-qr';
import { docToken, readDocToken, redactLink } from '../src/sales/documents/public-token';

const account = { bank: 'Vietcombank', bankBin: '970436', accountNo: '0071000123456', accountName: 'CONG TY HUONG SEN' };
const decode = (png: Buffer) => {
  const img = PNG.sync.read(png);
  return jsQR(new Uint8ClampedArray(img.data), img.width, img.height)?.data ?? null;
};
const data = (payment: Record<string, string>): DocData => ({ business: {}, customer: {}, doc: {}, items: [], totals: {}, contract: {}, payment, signatures: {} });

describe('VietQR ảnh', () => {
  it('payload số còn phải thu + nội dung = mã đề nghị; ảnh PNG decode ra đúng payload', async () => {
    const qr = invoiceQrOf({ code: 'TT-2040', amount: 6_400_000n, paidAmount: 1_400_000n }, account)!;
    expect(qr.amount).toBe('5000000');
    expect(qr.payload).toBe(vietQrPayload({ bin: '970436', account_no: '0071000123456', amount: '5000000', content: qr.content }));
    const text = decode(await qrPng(qr.payload));
    expect(text).toBe(qr.payload);
    expect(text).toContain('0071000123456');
    expect(text).toContain('54075000000');
  });

  it('chưa có tài khoản nhận / đã thu đủ → null', () => {
    expect(invoiceQrOf({ code: 'TT-1', amount: 100n, paidAmount: 0n }, null)).toBeNull();
    expect(invoiceQrOf({ code: 'TT-1', amount: 100n, paidAmount: 100n }, account)).toBeNull();
  });

  it('mẫu rich: ảnh ngay sau {{payment.vietqr}}; không có biến → khối cuối; src ngoài data:image/png bị bỏ', async () => {
    const img = pngDataUri(await qrPng('x'));
    const a = renderRich('payment_request', '<p>{{payment.vietqr}}</p><p>END</p>', data({ vietqr: 'Quét VietQR', vietqr_img: img }), 'GTGT');
    expect(a.indexOf('<img src="data:image/png;base64,')).toBeGreaterThan(a.indexOf('Quét VietQR'));
    expect(a.indexOf('<img')).toBeLessThan(a.indexOf('END'));
    const b = renderRich('payment_request', '<p>Không biến</p>', data({ vietqr_img: img }), 'GTGT');
    expect(b).toMatch(/Không biến<\/p><p><img src="data:image\/png/);
    const c = renderRich('payment_request', '<p>{{payment.vietqr}}</p>', data({ vietqr_img: 'https://evil.example/x.png' }), 'GTGT');
    expect(c).not.toContain('<img');
    expect(renderRich('receipt', '<p>{{payment.vietqr}}</p>', data({ vietqr_img: img }), 'GTGT')).not.toContain('<img');
  });
});

describe('token link công khai', () => {
  const key = Buffer.alloc(32, 7);
  const id = '0190f000-0000-7000-8000-00000000d0c1';
  it('đúng miền + khoá mới đọc được; sửa ký tự / khoá khác → null; che token khi log', () => {
    const t = docToken(key, id);
    expect(readDocToken(key, t)).toBe(id);
    expect(readDocToken(Buffer.alloc(32, 8), t)).toBeNull();
    expect(readDocToken(key, `${t.slice(0, -1)}${t.endsWith('A') ? 'B' : 'A'}`)).toBeNull();
    expect(readDocToken(key, `${id}.../../etc`)).toBeNull();
    expect(redactLink(`Xem: https://app/documents/${t}`)).toBe(`Xem: https://app/documents/${id}.…`);
  });
});
