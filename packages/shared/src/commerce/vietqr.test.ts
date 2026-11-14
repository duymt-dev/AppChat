import { describe, expect, it } from 'vitest';
import { crc16, transferContent, vietQrPayload } from './vietqr';

describe('VietQR (COMMERCE §5)', () => {
  it('CRC-16/CCITT-FALSE đúng giá trị chuẩn', () => {
    expect(crc16('123456789')).toBe('29B1');
  });

  it('QR động: có số tiền + nội dung mã đề nghị, CRC khớp phần thân', () => {
    const p = vietQrPayload({ bin: '970436', account_no: '0071000123456', amount: '12000000', content: 'TT002039' });
    expect(p.startsWith('000201010212')).toBe(true);
    expect(p).toContain('0010A000000727');
    expect(p).toContain('0006970436');
    expect(p).toContain('01130071000123456');
    expect(p).toContain('540812000000');
    expect(p).toContain('5802VN');
    expect(p).toContain('62120808TT002039');
    expect(p.slice(-4)).toBe(crc16(p.slice(0, -4)));
  });

  it('QR tĩnh khi không có số tiền', () => {
    const p = vietQrPayload({ bin: '970436', account_no: '0071000123456' });
    expect(p.startsWith('000201010211')).toBe(true);
    expect(p).not.toContain('5408');
  });

  it('nội dung CK bỏ dấu, ký tự lạ, tối đa 25 ký tự', () => {
    expect(transferContent('TT-002041 Chị Lan đợt 1')).toBe('TT002041 CHI LAN DOT 1');
    expect(transferContent('x'.repeat(40))).toHaveLength(25);
  });
});
