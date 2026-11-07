import { describe, expect, it } from 'vitest';
import { batches, guessMapping, toImportRows } from './import-map';

describe('ghép cột tệp nhập khách', () => {
  it('nhận tên cột tiếng Việt (có / không dấu) và tiếng Anh; mỗi trường một cột', () => {
    expect(guessMapping(['Họ và tên', 'SĐT', 'E-mail', 'Ghi chú', 'Tỉnh/Thành phố'])).toEqual(['full_name', 'phone', 'email', '', 'city']);
    expect(guessMapping(['Full name', 'Phone number', 'Name'])).toEqual(['full_name', 'phone', '']);
  });

  it('dòng → input contact.import: bỏ dòng thiếu tên, cắt độ dài, bỏ ô rỗng', () => {
    const rows = toImportRows(
      [
        ['Trần Bảo', '0938222110', ''],
        ['', '0938222111', 'x@y.vn'],
        ['A'.repeat(200), '', 'a@b.vn'],
      ],
      ['full_name', 'phone', 'email'],
    );
    expect(rows).toEqual([{ full_name: 'Trần Bảo', phone: '0938222110' }, { full_name: 'A'.repeat(120), email: 'a@b.vn' }]);
  });

  it('chia lô ≤ 500 dòng', () => {
    expect(batches(Array.from({ length: 1001 }, (_, i) => i)).map((b) => b.length)).toEqual([500, 500, 1]);
  });
});
