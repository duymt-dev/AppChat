// Đọc XLSX tệp người dùng tải lên (kernel/files/table — nhập khách, nhập sản phẩm, kho tri thức). Lỗi thật 2026-11-05: tệp mẫu có data
// validation / định dạng áp cho cả cột (`C2:C1048576`) làm `wb.xlsx.load` dựng hàng triệu ô — API treo > 45 giây, > 1 GB RAM, chặn event
// loop. Đọc (bỏ data validation / định dạng) phải xong nhanh, đúng dữ liệu, mọi sheet, bỏ dòng trống; vượt trần dòng / sheet → XlsxTooComplexError (caller trả 422).
import { describe, expect, it } from 'vitest';
import { readTable, xlsxSheets, XlsxTooComplexError } from '../src/kernel/files/table';

// ZIP tối giản (STORE, không nén) — đủ cho XLSX tay, không thêm phụ thuộc.
const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (b: Buffer) => {
  let c = 0xffffffff;
  for (const x of b) c = CRC[(c ^ x) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function zip(files: Record<string, string>): Buffer {
  const parts: Buffer[] = [];
  const dir: Buffer[] = [];
  let off = 0;
  for (const [name, text] of Object.entries(files)) {
    const data = Buffer.from(text, 'utf8');
    const n = Buffer.from(name, 'utf8');
    const crc = crc32(data);
    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0);
    h.writeUInt16LE(20, 4);
    h.writeUInt32LE(crc, 14);
    h.writeUInt32LE(data.length, 18);
    h.writeUInt32LE(data.length, 22);
    h.writeUInt16LE(n.length, 26);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt16LE(20, 4);
    c.writeUInt16LE(20, 6);
    c.writeUInt32LE(crc, 16);
    c.writeUInt32LE(data.length, 20);
    c.writeUInt32LE(data.length, 24);
    c.writeUInt16LE(n.length, 28);
    c.writeUInt32LE(off, 42);
    parts.push(h, n, data);
    dir.push(c, n);
    off += 30 + n.length + data.length;
  }
  const cd = Buffer.concat(dir);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(files).length, 8);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(off, 16);
  return Buffer.concat([...parts, cd, end]);
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const row = (r: number, cells: string[]) =>
  `<row r="${r}">${cells.map((v, i) => `<c r="${String.fromCharCode(65 + i)}${r}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`).join('')}</row>`;

/** Cột có danh sách chọn tới dòng 1.048.576 — tệp mẫu thật có 17 cột như vậy (exceljs dựng một mục cho MỖI ô: ~18 triệu). */
const WHOLE_COLS = ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'L', 'Q', 'T', 'W', 'X', 'Y', 'Z', 'AC', 'AF'];

/** XLSX một / nhiều sheet; `wholeColumn` = data validation + định dạng áp tới dòng 1.048.576 (như tệp mẫu thật). */
function xlsx(sheets: string[][][], wholeColumn = false): Buffer {
  const names = sheets.map((_, i) => `Sheet${i + 1}`);
  const files: Record<string, string> = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${names.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${names.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}</Relationships>`,
  };
  sheets.forEach((rows, i) => {
    const dv = wholeColumn
      ? `<dataValidations count="${WHOLE_COLS.length}">${WHOLE_COLS.map((c, k) => `<dataValidation type="list" allowBlank="1" showErrorMessage="1" sqref="${c}2 ${c}3:${c}387 ${c}388:${c}1048576"><formula1>choices_${k}</formula1></dataValidation>`).join('')}</dataValidations><conditionalFormatting sqref="A2:AK1048576"><cfRule type="expression" priority="1"><formula>LEN(A2)&gt;0</formula></cfRule></conditionalFormatting>`
      : '';
    files[`xl/worksheets/sheet${i + 1}.xml`] =
      `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:AK1048576"/><sheetData>${rows.map((r, k) => row(k + 1, r)).join('')}</sheetData>${dv}</worksheet>`;
  });
  return zip(files);
}

const HEAD = ['Tên khách hàng', 'Số điện thoại', 'Nhóm', 'Đồng ý'];
const people = (n: number) => Array.from({ length: n }, (_, i) => [`Khách ${i + 1}`, `0900${String(i).padStart(6, '0')}`, 'VIP', 'Có']);

describe('xlsxSheets — chỉ đọc giá trị ô, có trần', () => {
  it('data validation / định dạng áp cả cột (tới dòng 1.048.576): đọc nhanh, đúng dữ liệu', async () => {
    const t0 = Date.now();
    const s = await xlsxSheets(xlsx([[HEAD, ...people(300)], [['Hướng dẫn'], ['Điền từ dòng 2']]], true));
    // Bản cũ chặn event loop vô hạn (worker bị giết sau 58 giây); một mình ~1 giây, cả bộ song song trên máy tải nặng đo được 21 giây →
    // ngưỡng 45 giây vẫn phân biệt mà không đỏ chập chờn.
    expect(Date.now() - t0).toBeLessThan(45_000);
    expect(s.map((x) => x.name)).toEqual(['Sheet1', 'Sheet2']);
    expect(s[0]!.rows).toHaveLength(301);
    expect(s[0]!.rows[1]).toEqual({ n: 2, values: ['Khách 1', '0900000000', 'VIP', 'Có'] });
  }, 90_000);

  it('readTable lấy sheet đầu: hàng đầu là tên cột, dòng trống bỏ', async () => {
    const t = await readTable('khach.xlsx', 'application/octet-stream', xlsx([[HEAD, ['', '', '', ''], ...people(2)]], true));
    expect(t).toEqual({ columns: HEAD, rows: people(2) });
  });

  it('vượt trần dòng / sheet → XlsxTooComplexError có lý do (không treo, không trả dữ liệu cắt cụt)', async () => {
    await expect(xlsxSheets(xlsx([[HEAD, ...people(30)]]), { rows: 20 })).rejects.toMatchObject({ reason: 'too_many_rows' });
    await expect(xlsxSheets(xlsx([[HEAD], [HEAD], [HEAD]]), { sheets: 2 })).rejects.toBeInstanceOf(XlsxTooComplexError);
  });

  it('tệp không phải ZIP / hỏng → lỗi thường (caller báo "không đọc được")', async () => {
    await expect(xlsxSheets(Buffer.from('không phải xlsx'))).rejects.toThrow();
  });
});
