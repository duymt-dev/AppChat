// TIP-032d §2.1 (AC3): kiểm cấu trúc tệp đính kèm bản ghi — chỉ PDF / DOCX / XLSX / PNG / JPEG / WEBP / TXT / CSV; đuôi / nội dung lệch,
// HTML / SVG / thực thi / EML / ZIP rời bị chặn; gói Office: bom ZIP, đi ngược thư mục, mã hoá, macro, quan hệ ngoài nạp nội dung bị chặn
// (hyperlink cho qua); tiến trình con cô lập: không mạng / không tiến trình con, treo → timeout, thiếu bundle → isolation_unavailable
// (không kiểm trong tiến trình chính). Không có trạng thái "đã quét virus".
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateAttachment } from '../src/kernel/files/attachment-validator-entry';
import { validateIsolated } from '../src/kernel/files/attachment-validation';
import { badDocx, benignDocx, pdf, zip } from '../../../fixtures/contracts/files/build-fixtures';

const png = () => {
  const b = Buffer.alloc(40);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
  b.writeUInt32BE(13, 8);
  b.write('IHDR', 12, 'latin1');
  b.writeUInt32BE(64, 16);
  b.writeUInt32BE(48, 20);
  return b;
};

/** Bundle giả thay validator — ghi kết quả thử mạng / tiến trình con vào `reason` để test đọc. */
const fake = (body: string) => {
  const dir = mkdtempSync(join(tmpdir(), 'appchat-attval-'));
  const f = join(dir, 'attachment-validator.cjs');
  writeFileSync(f, `exports.validateAttachment = () => { ${body} };`);
  return f;
};

describe('validateAttachment (thuần)', () => {
  it('nhận đúng loại trong danh sách khi đuôi khớp nội dung', () => {
    expect(validateAttachment(pdf({ text: 'AT-1' }), 'bien-ban.pdf')).toEqual({ ok: true, kind: 'pdf' });
    expect(validateAttachment(benignDocx(['Phụ lục giao hàng']), 'phu-luc.docx')).toEqual({ ok: true, kind: 'docx' });
    expect(validateAttachment(png(), 'anh.png')).toEqual({ ok: true, kind: 'png' });
    expect(validateAttachment(Buffer.from('Mã,Số lượng\nSP-1,2\n'), 'ds.csv')).toEqual({ ok: true, kind: 'text' });
  });

  it.each([
    ['HTML đổi đuôi .txt', Buffer.from('<!doctype html><script>alert(1)</script>'), 'a.txt', 'unsupported_type'],
    ['SVG', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>'), 'a.png', 'unsupported_type'],
    ['tệp thực thi đổi đuôi .pdf', Buffer.from('MZ\x90\x00'), 'a.pdf', 'unsupported_type'],
    ['ZIP rời không phải Office', zip([{ name: 'a.txt', data: 'x' }]), 'a.zip', 'unsupported_type'],
    ['PDF đặt đuôi .docx', pdf(), 'a.docx', 'type_mismatch'],
    ['PDF cụt (không %%EOF)', Buffer.from('%PDF-1.4\n1 0 obj'), 'a.pdf', 'corrupt'],
    ['rỗng', Buffer.alloc(0), 'a.pdf', 'empty'],
  ])('chặn: %s', (_n, body, name, reason) => {
    expect(validateAttachment(body as Buffer, name as string)).toEqual({ ok: false, reason });
  });

  it.each([
    ['bom ZIP (tỷ lệ > 100)', badDocx.zipBomb(), 'zip_bomb'],
    ['đi ngược thư mục', badDocx.pathTraversal(), 'path_traversal'],
    ['macro', badDocx.macro(), 'macro'],
    ['quan hệ ngoài nạp ảnh', badDocx.externalRelationship(), 'external_relationship'],
    ['Office mã hoá (CFB)', badDocx.encrypted(), 'unsupported_type'],
  ])('gói Office: %s', (_n, body, reason) => {
    expect(validateAttachment(body, 'x.docx')).toEqual({ ok: false, reason });
  });

  it('hyperlink ngoài chỉ là địa chỉ hiển thị → cho qua', () => {
    const rels = '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://appchat.vn" TargetMode="External"/></Relationships>';
    const doc = benignDocx(['Có link']);
    // Thay rels của tài liệu bằng bản có hyperlink (dựng lại gói).
    const withLink = zip([
      { name: '[Content_Types].xml', data: '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>' },
      { name: '_rels/.rels', data: '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>' },
      { name: 'word/_rels/document.xml.rels', data: rels },
      { name: 'word/document.xml', data: '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p/></w:body></w:document>' },
    ]);
    expect(doc.length).toBeGreaterThan(0);
    expect(validateAttachment(withLink, 'link.docx')).toEqual({ ok: true, kind: 'docx' });
  });

  it('kết quả chỉ là "hợp lệ về cấu trúc" — không có trạng thái quét virus', () => {
    expect(Object.keys(validateAttachment(pdf(), 'a.pdf')).sort()).toEqual(['kind', 'ok']);
  });
});

describe('validateIsolated (tiến trình con)', () => {
  it('thiếu bundle → isolation_unavailable, không kiểm trong tiến trình chính', async () => {
    expect(await validateIsolated(null, pdf(), 'a.pdf')).toEqual({ ok: false, reason: 'isolation_unavailable' });
    expect(await validateIsolated(join(tmpdir(), 'khong-co.cjs'), pdf(), 'a.pdf')).toEqual({ ok: false, reason: 'isolation_unavailable' });
  });

  it('trong tiến trình con: mạng / tiến trình con bị chặn, không biến môi trường bí mật', async () => {
    const f = fake(`
      const out = [];
      try { require('node:net').connect(80, '1.1.1.1'); out.push('net:open'); } catch (e) { out.push('net:' + (e.code || 'denied')); }
      try { require('node:child_process').execSync('whoami'); out.push('child:open'); } catch (e) { out.push('child:' + (e.code || 'denied')); }
      out.push('env:' + Object.keys(process.env).filter((k) => /DATABASE|REDIS|KEY|SECRET|TOKEN/.test(k)).length);
      return { ok: false, reason: out.join(',') };
    `);
    const r = await validateIsolated(f, Buffer.from('x'), 'a.txt');
    expect(r).toEqual({ ok: false, reason: 'net:NETWORK_DENIED,child:NETWORK_DENIED,env:0' });
  });

  it('treo → timeout, cả cây bị giết', async () => {
    const f = fake('for (;;) {}');
    expect(await validateIsolated(f, Buffer.from('x'), 'a.txt', { timeoutMs: 1_500 })).toEqual({ ok: false, reason: 'timeout' });
  }, 20_000);
});
