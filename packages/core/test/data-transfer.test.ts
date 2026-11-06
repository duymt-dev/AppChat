// TIP-038b P1 (DC-374) — kiểm dòng nhập tất định: chuẩn hoá theo kiểu trường (SĐT giữ số 0 đầu, email thường, tiền bỏ dấu nghìn, ngày
// dd/mm/yyyy → ISO, enum đúng giá trị), ô công thức giữ nguyên chữ; ánh xạ sai → 422 theo trường; đoán ánh xạ từ tiêu đề tiếng Việt
// có / không dấu; khoá dòng ổn định theo (checksum, sheet, số dòng); đọc CSV thật (BOM, dòng trống, giới hạn cột).
import { describe, expect, it } from 'vitest';
import { AppError, guessTransferMapping, type TransferField } from '@appchat/shared';
import { checkRow, normalizeCell, resolveMapping } from '../src/data-transfer/services/validation';
import { rowKeyOf } from '../src/data-transfer/services/planner';
import { parseTransferFile } from '../src/data-transfer/services/file-parser';

const f = (type: TransferField['type'], extra: Partial<TransferField> = {}): TransferField => ({
  key: 'x',
  type,
  aliases: [],
  ...extra,
});
const fields = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return (e as AppError).fields;
  }
  return null;
};

describe('normalizeCell', () => {
  it('chuẩn hoá theo kiểu, sai → mã lỗi (không tự sửa)', () => {
    expect(normalizeCell(f('phone'), ' 0909.123.456 ')).toEqual({ value: '0909123456' });
    expect(normalizeCell(f('phone'), '+84 909 123 456')).toEqual({ value: '0909123456' });
    expect(normalizeCell(f('phone'), '12')).toEqual({ error: 'invalid' });
    expect(normalizeCell(f('email'), 'An@VD.VN')).toEqual({ value: 'an@vd.vn' });
    expect(normalizeCell(f('email'), 'sai-email')).toEqual({ error: 'invalid' });
    expect(normalizeCell(f('money'), '1.250.000 ₫')).toEqual({ value: '1250000' });
    expect(normalizeCell(f('money'), '12,5')).toEqual({ value: '125' });
    expect(normalizeCell(f('money'), '-5000')).toEqual({ error: 'invalid' });
    expect(normalizeCell(f('number'), '2,5')).toEqual({ value: '2.5' });
    expect(normalizeCell(f('date'), '7/11/2026')).toEqual({ value: '2026-11-07' });
    expect(normalizeCell(f('date'), '2026-02-30')).toEqual({ error: 'invalid' });
    expect(normalizeCell(f('enum', { options: ['manual', 'referral'] }), 'referral')).toEqual({
      value: 'referral',
    });
    expect(normalizeCell(f('enum', { options: ['manual'] }), 'Manual')).toEqual({ error: 'option' });
    expect(normalizeCell(f('text', { max: 3 }), 'abcd')).toEqual({ error: 'too_long' });
    expect(normalizeCell(f('text'), '   ')).toEqual({ value: null });
    expect(normalizeCell(f('text'), '=HYPERLINK("x")')).toEqual({ value: '=HYPERLINK("x")' });
  });
});

describe('ánh xạ + kiểm dòng', () => {
  const cols = ['Họ và tên', 'SĐT', 'E-mail', 'Ghi chú'];

  it('đoán ánh xạ từ tiêu đề có / không dấu; cột không khớp bỏ qua', () => {
    expect(guessTransferMapping('contact', cols)).toMatchObject({ full_name: 'Họ và tên', phone: 'SĐT' });
    expect(guessTransferMapping('contact', ['ho ten', 'so dien thoai'])).toEqual({
      full_name: 'ho ten',
      phone: 'so dien thoai',
    });
    expect(guessTransferMapping('contact', ['Ghi chú'])).toEqual({});
  });

  it('ánh xạ sai trường / cột → 422 theo trường', () => {
    expect(fields(() => resolveMapping('contact', cols, { full_name: 'Tên', secret: 'SĐT' }))).toEqual({
      'mapping.full_name': 'column_not_found',
      'mapping.secret': 'unknown_field',
    });
  });

  it('thiếu trường bắt buộc (kể cả chưa ánh xạ) → required; dòng đúng giữ số 0 đầu', () => {
    const map = resolveMapping('contact', cols, { full_name: 'Họ và tên', phone: 'SĐT' });
    expect(checkRow('contact', map, ['Nguyễn An', '0901234567', '', ''], 1)).toEqual({
      rowNo: 1,
      data: { full_name: 'Nguyễn An', phone: '0901234567' },
      errors: {},
    });
    expect(checkRow('contact', map, ['', 'x', '', ''], 2).errors).toEqual({
      full_name: 'required',
      phone: 'invalid',
    });
    expect(
      checkRow('contact', resolveMapping('contact', cols, { phone: 'SĐT' }), ['', '0901234567'], 3).errors,
    ).toEqual({ full_name: 'required' });
  });

  it('khoá dòng ổn định theo checksum + sheet + số dòng', () => {
    expect(rowKeyOf('a', null, 1)).toBe(rowKeyOf('a', null, 1));
    expect(
      new Set([
        rowKeyOf('a', null, 1),
        rowKeyOf('a', 'S1', 1),
        rowKeyOf('b', null, 1),
        rowKeyOf('a', null, 2),
      ]).size,
    ).toBe(4);
  });
});

describe('parseTransferFile', () => {
  it('CSV có BOM + dòng trống → bảng cột / dòng', async () => {
    const body = Buffer.from('﻿Họ tên,SĐT\r\nAn,0901234567\r\n\r\nBình,0902222333\r\n');
    const t = await parseTransferFile({ name: 'k.csv', mime: 'text/csv', body });
    expect(t.columns).toEqual(['Họ tên', 'SĐT']);
    expect(t.rows).toEqual([
      ['An', '0901234567'],
      ['Bình', '0902222333'],
    ]);
  });

  it('quá số cột → 422', async () => {
    const body = Buffer.from(
      `${Array.from({ length: 61 }, (_, i) => `c${i}`).join(',')}\n${'1,'.repeat(60)}1\n`,
    );
    await expect(parseTransferFile({ name: 'w.csv', mime: 'text/csv', body })).rejects.toBeInstanceOf(
      AppError,
    );
  });
});
