// TIP-033b §5.1: tệp CSV của khung xuất — BOM UTF-8, chú thích + tiêu đề, chống chèn công thức (= + - @ tab CR → thêm '), số giữ số, ô có
// dấu phẩy / ngoặc kép / xuống dòng được bọc.
import { describe, expect, it } from 'vitest';
import { csvCell, csvFile } from '../src/insights/exports/export-csv';

async function* once<T>(x: T) {
  yield x;
}

describe('export CSV', () => {
  it('ô: công thức bị vô hiệu, số giữ nguyên, bọc khi cần, null trống', () => {
    expect(['=1+1', '+84', '-3', '@x', '\tA'].map(csvCell)).toEqual(["'=1+1", "'+84", "'-3", "'@x", "'\tA"]);
    expect(csvCell(-3)).toBe('-3');
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(csvCell(null)).toBe('');
  });

  it('tệp: BOM + chú thích + tiêu đề + dòng, CRLF', async () => {
    const buf = await csvFile('Liệu trình · Asia/Ho_Chi_Minh', [{ key: 'a', header: 'Tên' }, { key: 'b', header: 'Còn lại' }], once([['Gói', 7]]));
    expect([...buf.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(buf.subarray(3).toString('utf8')).toBe('Liệu trình · Asia/Ho_Chi_Minh\r\nTên,Còn lại\r\nGói,7\r\n');
  });
});
