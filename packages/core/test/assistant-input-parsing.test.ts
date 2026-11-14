// TIP-023f §2 (parser thật): PDF nhiều trang giữ số trang THẬT; CSV giữ số bản ghi + dòng vật lý qua bản ghi trống và ô nhiều dòng;
// XLSX theo sheet + dòng thật, chuỗi giữ nguyên; DOCX theo đoạn, macro / zip bomb / đường đi ngược bị chặn trước giải nén; ảnh kiểm
// kích thước, PNG động / GIF / SVG bị từ chối; loại theo nội dung, không theo tên.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { badDocx, benignDocx, pdf } from '../../../fixtures/contracts/files/build-fixtures';
import { csvRecords } from '../src/ai/assistant/input/table-parts';
import { extractInput } from '../src/ai/assistant/input/extract';
import { inspectImage } from '../src/ai/assistant/input/images';
import { detectKind } from '../src/ai/assistant/input/parse-bounds';

const kb = (f: string) => readFileSync(join(__dirname, 'fixtures/kb', f));
const png = (w: number, h: number, extra = '') => {
  const b = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
  b.writeUInt32BE(13, 8);
  b.write('IHDR', 12, 'latin1');
  b.writeUInt32BE(w, 16);
  b.writeUInt32BE(h, 20);
  return Buffer.concat([b, Buffer.from(extra, 'latin1'), Buffer.from('IDAT', 'latin1')]);
};
const jpeg = (w: number, h: number) => Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, h >> 8, h & 255, w >> 8, w & 255, 0x03, 0, 0, 0, 0, 0, 0]);
const err = (p: Promise<unknown>) => p.then(() => null, (e: { reason?: string }) => e.reason);

describe('PDF', () => {
  it('3 trang → mỗi phần gắn đúng số trang thật', async () => {
    const r = await extractInput(pdf({ pages: 3, text: 'CANARY PX-91' }), 'x.bin');
    expect(r.kind).toBe('pdf');
    expect(r.parts.map((p) => p.locator.page)).toEqual([1, 2, 3]);
    expect(r.parts[2]!.text).toContain('trang 3');
  });

  it('không có chữ → scanned_no_text; rác → corrupt', async () => {
    const blank = Buffer.from(pdf().toString('latin1').replace(/BT [^\n]*ET/, 'q Q').replace(/\/Length \d+/, '/Length 3'), 'latin1');
    expect(await err(extractInput(blank, 'scan.pdf'))).toBe('scanned_no_text');
    expect(await err(extractInput(Buffer.from('%PDF-1.4 garbage'), 'a.pdf'))).toBe('corrupt');
  });
});

describe('CSV', () => {
  it('bản ghi trống + ô ngoặc kép nhiều dòng → số bản ghi và dòng vật lý thật', () => {
    const r = csvRecords('ten,ghi_chu\nAn,"dòng 1\ndòng 2"\n\nBinh,ok\n');
    expect(r.map((x) => [x.record, x.lineStart, x.lineEnd])).toEqual([[1, 1, 1], [2, 2, 3], [3, 5, 5]]);
    expect(r[1]!.cells[1]).toBe('dòng 1\ndòng 2');
  });

  it('extract: locator csv_record + tên cột; số dạng chuỗi giữ nguyên', async () => {
    const r = await extractInput(Buffer.from('ma,gia\nSP-01,"0012500000.10"\n'), 'bang.csv');
    expect(r.parts).toEqual([{ locator: { kind: 'csv_record', record: 2, line_start: 2, line_end: 2 }, text: 'ma: SP-01 | gia: 0012500000.10' }]);
  });
});

describe('XLSX / DOCX / HTML', () => {
  it('XLSX thật → sheet + dòng thật', async () => {
    const r = await extractInput(kb('services.xlsx'), 'services.xlsx');
    expect(r.kind).toBe('xlsx');
    expect(r.parts[0]!.locator).toMatchObject({ kind: 'sheet_row', row: 2 });
    expect(r.parts[0]!.locator.sheet).toBeTruthy();
  });

  it('DOCX thật → đoạn; macro / zip bomb / đường đi ngược → archive_bounds trước giải nén', async () => {
    const r = await extractInput(benignDocx(['Điều 1 canary DX-55', 'Điều 2']), 'h.docx');
    expect(r.kind).toBe('docx');
    expect(r.parts.map((p) => p.locator.kind)).toEqual(['paragraph', 'paragraph']);
    expect(r.parts[0]!.text).toContain('DX-55');
    expect(await err(extractInput(badDocx.macro(), 'm.docx'))).toBe('archive_bounds');
    expect(await err(extractInput(badDocx.zipBomb(), 'b.docx'))).toBe('archive_bounds');
    expect(await err(extractInput(badDocx.pathTraversal(), 't.docx'))).toBe('archive_bounds');
  });

  it('HTML: bỏ script, không đánh số trang giả', async () => {
    const r = await extractInput(Buffer.from('<html><body><h1>Tiêu đề</h1><p>Nội dung</p><script>steal()</script></body></html>'), 'a.html');
    expect(r.parts.map((p) => p.text)).toEqual(['Tiêu đề', 'Nội dung']);
    expect(r.parts.every((p) => p.locator.page === undefined)).toBe(true);
  });
});

describe('ảnh + nhận diện loại', () => {
  it('PNG / JPEG trong trần → một phần ảnh; vượt cạnh / MP → image_bounds; APNG → unsupported', () => {
    expect(inspectImage('png', png(800, 600))).toEqual({ kind: 'png', width: 800, height: 600 });
    expect(inspectImage('jpeg', jpeg(1024, 768))).toEqual({ kind: 'jpeg', width: 1024, height: 768 });
    expect(() => inspectImage('png', png(5000, 10))).toThrow(expect.objectContaining({ reason: 'image_bounds' }));
    expect(() => inspectImage('png', png(4096, 4096))).toThrow(expect.objectContaining({ reason: 'image_bounds' }));
    expect(() => inspectImage('png', png(10, 10, 'acTL'))).toThrow(expect.objectContaining({ reason: 'unsupported_type' }));
  });

  it('tên không quyết định loại: exe đổi tên .pdf / GIF / SVG → không nhận', async () => {
    expect(detectKind(Buffer.from('MZ\x90\x00'), 'a.pdf')).toBeNull();
    expect(await err(extractInput(Buffer.from('GIF89a\x01\x00'), 'a.png'))).toBe('unsupported_type');
    expect(detectKind(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'), 'a.svg')).toBe('html');
    expect(detectKind(pdf(), 'a.txt')).toBe('pdf');
  });

  it('.eml → phần header + body, đính kèm chỉ liệt kê', async () => {
    const r = await extractInput(Buffer.from('Subject: Hello\r\nFrom: a@b.c\r\n\r\nBody canary EM-3'), 'thu.eml');
    expect(r.kind).toBe('eml');
    expect(r.parts.map((p) => p.locator.part)).toEqual(['header', 'body']);
    expect(r.parts[1]!.text).toContain('EM-3');
  });
});
