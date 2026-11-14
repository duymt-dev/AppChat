// TIP-030c §2.1, §2.4: OTP HMAC theo khoá + người ký + thế hệ — mã đúng ở thế hệ khác / người ký khác / khoá khác đều sai; định dạng sai sai.
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { otpMac, otpMatches } from '../src/contracts/signing/otp';

const key = Buffer.alloc(32, 7);

describe('otpMatches', () => {
  it('đúng người ký + thế hệ + khoá mới khớp', () => {
    const s = { id: 'signer-a', otpGeneration: 3, otpHash: otpMac(key, 'signer-a', 3, '123456') };
    expect(otpMatches(key, s, '123456')).toBe(true);
    expect(otpMatches(key, { ...s, otpGeneration: 4 }, '123456')).toBe(false);
    expect(otpMatches(key, { ...s, id: 'signer-b' }, '123456')).toBe(false);
    expect(otpMatches(Buffer.alloc(32, 8), s, '123456')).toBe(false);
    expect(otpMatches(key, s, '12345')).toBe(false);
    expect(otpMatches(key, { ...s, otpHash: null }, '123456')).toBe(false);
  });

  it('không phải băm trần của mã 6 số', () => {
    expect(otpMac(key, 's', 1, '000000')).not.toBe(createHash('sha256').update('s:000000').digest('hex'));
    expect(otpMac(key, 's', 1, '000000')).not.toBe(otpMac(key, 's', 2, '000000'));
  });
});
