// TIP-030 unit: link ký một lần (token HMAC, OTP băm gắn người ký, che đích gửi), trang chứng nhận (escape, chỉ nhận PNG), ghép PDF.
import { describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import { maskTarget, newOtp, otpHash, readSignToken, sameOtp, signToken } from '../src/contracts/services/sign-link';
import { certificateHtml, mergePdfs, type CertInput } from '../src/contracts/services/contract-sign-pdf';

const T = '0190f000-0000-7000-8000-000000000003';
const S = '0190f000-0000-7000-8000-000000000004';

describe('link ký', () => {
  it('token đọc lại được; sửa id / chữ ký / khoá khác → null', () => {
    const key = randomBytes(32);
    const t = signToken(key, T);
    expect(readSignToken(key, t)).toBe(T);
    expect(readSignToken(key, t.replace(T, S))).toBeNull();
    expect(readSignToken(key, `${t.slice(0, -1)}${t.endsWith('A') ? 'B' : 'A'}`)).toBeNull();
    expect(readSignToken(randomBytes(32), t)).toBeNull();
    expect(readSignToken(key, 'abc')).toBeNull();
  });

  it('OTP 6 số; băm gắn người ký — đúng người, đúng mã mới khớp', () => {
    const otp = newOtp();
    expect(otp).toMatch(/^\d{6}$/);
    const h = otpHash(S, otp);
    expect(sameOtp(S, otp, h)).toBe(true);
    expect(sameOtp(T, otp, h)).toBe(false);
    expect(sameOtp(S, otp === '000000' ? '111111' : '000000', h)).toBe(false);
    expect(sameOtp(S, 'abcdef', h)).toBe(false);
    expect(sameOtp(S, otp, null)).toBe(false);
  });

  it('che SĐT / email', () => {
    expect(maskTarget('0909123456')).toBe('•••••••456');
    expect(maskTarget('lan@example.com')).toBe('la•••@example.com');
  });
});

const party = (name: string, png: string) => ({ label: 'Bên', name, signaturePng: png, signedAt: new Date('2026-11-01T03:00:00Z'), ip: '1.2.3.4', userAgent: 'UA', otpChannel: 'email' });
const cert = (over: Partial<CertInput> = {}): CertInput => ({
  code: 'HĐ-1001',
  title: 'Liệu trình',
  contentSha256: 'a'.repeat(64),
  txId: T,
  locale: 'vi',
  timeZone: 'Asia/Ho_Chi_Minh',
  business: party('Spa <An>', 'data:image/png;base64,AAAA'),
  customer: party('Khách', 'javascript:alert(1)'),
  events: [{ type: 'signed', at: new Date('2026-11-01T03:00:00Z'), actor: 'Khách', ip: null }],
  ...over,
});

describe('trang chứng nhận', () => {
  it('escape tên, chỉ nhúng ảnh PNG data:, có mã HĐ + mã băm + nhãn sự kiện theo locale', () => {
    const html = certificateHtml(cert());
    expect(html).toContain('Spa &#60;An&#62;');
    expect(html).not.toContain('<An>');
    expect(html).toContain('src="data:image/png;base64,AAAA"');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('HĐ-1001');
    expect(html).toContain('a'.repeat(64));
    expect(html).toContain('Ký');
    expect(certificateHtml(cert({ locale: 'en' }))).not.toContain('Ký<');
  });
});

describe('ghép PDF', () => {
  it('nối đủ trang theo thứ tự', async () => {
    const make = async (n: number) => {
      const d = await PDFDocument.create();
      for (let i = 0; i < n; i++) d.addPage([200 + i, 200]);
      return Buffer.from(await d.save());
    };
    const out = await PDFDocument.load(await mergePdfs([await make(2), await make(1)]));
    expect(out.getPageCount()).toBe(3);
    expect(out.getPages().map((p) => p.getWidth())).toEqual([200, 201, 200]);
  });
});
