// Sinh tệp mẫu hợp đồng cho test guard (TIP-030b spec 5) — chỉ dùng thư viện có sẵn của Node (zlib), không tệp nhị phân trong repo.
// ZIP viết tay (local header + central directory) để dựng được cả gói xấu (zip bomb, đường đi ngược, macro) mà thư viện ZIP chuẩn từ chối.
import { deflateRawSync } from 'node:zlib';

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

const crc32 = (b: Buffer) => {
  let c = 0xffffffff;
  for (const x of b) c = CRC_TABLE[(c ^ x) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

export interface ZipEntry {
  name: string;
  data: string | Buffer;
  /** Nén deflate (mặc định: lưu thẳng). */
  deflate?: boolean;
}

/** Gói ZIP tối thiểu hợp lệ (PizZip / LibreOffice mở được). */
export function zip(entries: readonly ZipEntry[]): Buffer {
  const locals: Buffer[] = [];
  const cens: Buffer[] = [];
  let off = 0;
  for (const e of entries) {
    const raw = Buffer.isBuffer(e.data) ? e.data : Buffer.from(e.data, 'utf8');
    const body = e.deflate ? deflateRawSync(raw) : raw;
    const name = Buffer.from(e.name, 'utf8');
    const crc = crc32(raw);
    const method = e.deflate ? 8 : 0;
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0x0800, 6);
    lh.writeUInt16LE(method, 8);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(body.length, 18);
    lh.writeUInt32LE(raw.length, 22);
    lh.writeUInt16LE(name.length, 26);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(20, 4);
    ch.writeUInt16LE(20, 6);
    ch.writeUInt16LE(0x0800, 8);
    ch.writeUInt16LE(method, 10);
    ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(body.length, 20);
    ch.writeUInt32LE(raw.length, 24);
    ch.writeUInt16LE(name.length, 28);
    ch.writeUInt32LE(off, 42);
    locals.push(lh, name, body);
    cens.push(ch, name);
    off += lh.length + name.length + body.length;
  }
  const cd = Buffer.concat(cens);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(off, 16);
  return Buffer.concat([...locals, cd, end]);
}

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const MAIN = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml';

const contentTypes = (main = MAIN) =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="${main}"/></Types>`;
const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
const docRels = (extra = '') => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${extra}</Relationships>`;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const documentXml = (paras: readonly string[], raw = '') =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${W}"><w:body>${paras.map((p) => `<w:p><w:r><w:t xml:space="preserve">${esc(p)}</w:t></w:r></w:p>`).join('')}${raw}</w:body></w:document>`;

/** Hợp đồng DOCX lành tính (chữ tiếng Việt có dấu). */
export const CONTRACT_TEXT = [
  'HỢP ĐỒNG DỊCH VỤ',
  'Bên A: Công ty TNHH Mẫu Thử',
  'Bên B: Nguyễn Văn An',
  'Giá trị hợp đồng: 12.500.000 đồng',
  'Thời hạn: từ 01/12/2026 đến 30/11/2027',
] as const;

const base = (doc: string, rels = docRels()): ZipEntry[] => [
  { name: '[Content_Types].xml', data: contentTypes() },
  { name: '_rels/.rels', data: rootRels },
  { name: 'word/_rels/document.xml.rels', data: rels },
  { name: 'word/document.xml', data: doc, deflate: true },
];

export const benignDocx = (paras: readonly string[] = CONTRACT_TEXT): Buffer => zip(base(documentXml(paras)));

/** Bộ DOCX xấu — mỗi tệp đúng một lý do từ chối. */
export const badDocx = {
  externalRelationship: () =>
    zip(base(documentXml(CONTRACT_TEXT), docRels('<Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="http://attacker.example/p.png" TargetMode="External"/>'))),
  macro: () =>
    zip([
      { name: '[Content_Types].xml', data: contentTypes('application/vnd.ms-word.document.macroEnabled.main+xml') },
      { name: '_rels/.rels', data: rootRels },
      { name: 'word/document.xml', data: documentXml(CONTRACT_TEXT) },
      { name: 'word/vbaProject.bin', data: Buffer.from([0xd0, 0xcf, 0x11, 0xe0]) },
    ]),
  embeddedObject: () => zip([...base(documentXml(CONTRACT_TEXT)), { name: 'word/embeddings/oleObject1.bin', data: Buffer.from('MZ') }]),
  fieldCode: () => zip(base(documentXml(CONTRACT_TEXT, '<w:p><w:r><w:instrText> DDEAUTO c:\\windows\\system32\\cmd.exe "/c calc"</w:instrText></w:r></w:p>'))),
  pathTraversal: () => zip([...base(documentXml(CONTRACT_TEXT)), { name: '../../evil.txt', data: 'x' }]),
  /** 30MB số 0 nén còn vài chục KB — tỷ lệ > 100, entry > 20MB. */
  zipBomb: () => zip([...base(documentXml(CONTRACT_TEXT)), { name: 'word/media/bomb.xml', data: Buffer.alloc(30 * 1024 * 1024), deflate: true }]),
  /** Office mã hoá = tệp OLE (CFB). */
  encrypted: () => Buffer.concat([Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), Buffer.alloc(504)]),
  /** ZIP hợp lệ nhưng không phải DOCX. */
  notDocx: () => zip([{ name: 'readme.txt', data: 'hello' }]),
};

export interface PdfOpts {
  pages?: number;
  text?: string;
  /** Chèn vào dict Catalog (dựng PDF xấu). */
  extraCatalog?: string;
  trailerExtra?: string;
}

/** PDF tối thiểu: `pages` trang, mỗi trang một dòng chữ. */
export function pdf(opts: PdfOpts = {}): Buffer {
  const n = opts.pages ?? 1;
  const text = (opts.text ?? 'HOP DONG DICH VU - Gia tri 12.500.000 dong').replace(/[()\\]/g, '');
  const objs: string[] = [];
  objs.push(`<< /Type /Catalog /Pages 2 0 R ${opts.extraCatalog ?? ''} >>`);
  const kids = Array.from({ length: n }, (_, i) => `${4 + i * 2} 0 R`).join(' ');
  objs.push(`<< /Type /Pages /Kids [${kids}] /Count ${n} >>`);
  objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  for (let i = 0; i < n; i++) {
    const content = `BT /F1 12 Tf 72 720 Td (${text} - trang ${i + 1}) Tj ET`;
    objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + i * 2} 0 R >>`);
    objs.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  }
  let out = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n';
  const offs: number[] = [];
  objs.forEach((o, i) => {
    offs.push(Buffer.byteLength(out, 'latin1'));
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out, 'latin1');
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R ${opts.trailerExtra ?? ''} >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

/** Bộ PDF xấu — mỗi tệp đúng một lý do từ chối. */
export const badPdf = {
  javascript: () => pdf({ extraCatalog: '/OpenAction << /S /JavaScript /JS (app.alert 1) >>' }),
  /** Tên viết dạng #xx để lách dò chuỗi thô. */
  hexEscapedJs: () => pdf({ extraCatalog: '/Names << /Java#53cript 3 0 R >>' }),
  launch: () => pdf({ extraCatalog: '/OpenAction << /S /Launch /F (cmd.exe) >>' }),
  embeddedFile: () => pdf({ extraCatalog: '/Names << /EmbeddedFiles << /Names [] >> >>' }),
  encrypted: () => pdf({ trailerExtra: '/Encrypt << /Filter /Standard /V 1 /R 2 /O (x) /U (y) /P -4 >>' }),
  tooManyPages: () => pdf({ pages: 201 }),
  /** `.exe` đổi tên `.pdf`: bytes MZ. */
  renamedExe: () => Buffer.concat([Buffer.from('MZ'), Buffer.alloc(200)]),
  notPdf: () => Buffer.from('<html><body>not a pdf</body></html>'),
};
