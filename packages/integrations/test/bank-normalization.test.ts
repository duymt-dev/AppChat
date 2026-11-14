// TIP-012b §2.2: chuẩn hoá chặt dùng chung — tiền nguyên an toàn / bigint, không cắt; số tài khoản giữ số 0 đầu + chữ; giờ VN ngày có thật.
import { describe, expect, it } from 'vitest';
import { externalId, normalizeAccount, strictAmount, vnLocalTime } from '../src/bank-validation';
import { ProviderError } from '../src/provider-errors';

const bad = (f: () => unknown) => expect(f).toThrow(ProviderError);

describe('strictAmount', () => {
  it('nhận số nguyên an toàn / chuỗi chữ số; biên bigint Postgres chính xác', () => {
    expect(strictAmount(1000000, 'a')).toEqual({ abs: '1000000', negative: false });
    expect(strictAmount(Number.MAX_SAFE_INTEGER, 'a').abs).toBe('9007199254740991');
    expect(strictAmount('9223372036854775807', 'a').abs).toBe('9223372036854775807');
    expect(strictAmount('0', 'a')).toEqual({ abs: '0', negative: false });
    expect(strictAmount(-193000, 'a', true)).toEqual({ abs: '193000', negative: true });
  });
  it('từ chối thập phân / mũ / âm (khi không cho) / vượt an toàn / vượt bigint / kiểu lạ', () => {
    bad(() => strictAmount(1000.5, 'a'));
    bad(() => strictAmount('1e6', 'a'));
    bad(() => strictAmount('1000.00', 'a'));
    bad(() => strictAmount(-5, 'a'));
    bad(() => strictAmount(Number.MAX_SAFE_INTEGER + 2, 'a'));
    bad(() => strictAmount('9223372036854775808', 'a'));
    bad(() => strictAmount(null, 'a'));
    bad(() => strictAmount(' 100', 'a'));
  });
});

describe('normalizeAccount', () => {
  it('bỏ khoảng trắng / chấm / gạch, giữ số 0 đầu và chữ cái (viết hoa)', () => {
    expect(normalizeAccount('0071 000.123-456')).toBe('0071000123456');
    expect(normalizeAccount('vqr0012ab')).toBe('VQR0012AB');
  });
  it('rỗng / ký tự lạ / quá dài → lỗi', () => {
    bad(() => normalizeAccount(''));
    bad(() => normalizeAccount('   '));
    bad(() => normalizeAccount('12#34'));
    bad(() => normalizeAccount('1'.repeat(41)));
    bad(() => normalizeAccount(undefined));
  });
});

describe('vnLocalTime', () => {
  it('giờ VN → UTC (−7 giờ), qua nửa đêm đúng ngày', () => {
    expect(vnLocalTime('2026-10-30 14:02:37', 'd')).toBe('2026-10-30T07:02:37.000Z');
    expect(vnLocalTime('2026-01-01 03:00:00', 'd')).toBe('2025-12-31T20:00:00.000Z');
    expect(vnLocalTime('2028-02-29 00:00:00', 'd')).toBe('2028-02-28T17:00:00.000Z');
  });
  it('ngày / giờ không có thật, có múi giờ, định dạng khác → lỗi (không dùng giờ máy chủ)', () => {
    bad(() => vnLocalTime('2026-02-29 10:00:00', 'd'));
    bad(() => vnLocalTime('2026-10-30 24:00:00', 'd'));
    bad(() => vnLocalTime('2026-10-30T14:02:37Z', 'd'));
    bad(() => vnLocalTime('30/10/2026 14:02:37', 'd'));
    bad(() => vnLocalTime(1730000000, 'd'));
  });
});

describe('externalId', () => {
  it('chuỗi / số nguyên không âm, 1–200 ký tự', () => {
    expect(externalId(92704)).toBe('92704');
    expect(externalId(' FT26303 ')).toBe('FT26303');
    bad(() => externalId(''));
    bad(() => externalId(-1));
    bad(() => externalId(1.5));
    bad(() => externalId('x'.repeat(201)));
  });
});
