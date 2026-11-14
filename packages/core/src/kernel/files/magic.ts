// Nhận diện loại tệp từ NỘI DUNG (TIP-045b annex B; ops §3.1 — không thêm `file-type`, tự kiểm chữ ký): ảnh raster, PDF, MP4 (hộp
// `ftyp` hợp lệ, không chỉ 4 byte), gói OOXML (ZIP + `[Content_Types].xml` phân biệt DOCX / XLSX / PPTX qua central directory, không
// giải nén), văn bản UTF-8 (không NUL, không mã điều khiển lạ). Tệp thực thi (PE / ELF / Mach-O / shebang), OLE / CFB (Office cũ hoặc
// Office mã hoá), SVG / HTML giả ảnh → loại riêng để guard từ chối.
import { zipEntries, ZipRefusedError } from './zip-guard';

export type Sniffed = 'png' | 'jpeg' | 'gif' | 'webp' | 'pdf' | 'mp4' | 'docx' | 'xlsx' | 'pptx' | 'zip' | 'text' | 'executable' | 'cfb' | 'markup' | 'unknown';

const starts = (b: Uint8Array, sig: number[], at = 0) => b.length >= at + sig.length && sig.every((x, i) => b[at + i] === x);
const ascii = (b: Uint8Array, from: number, to: number) => String.fromCharCode(...b.subarray(from, Math.min(to, b.length)));

/** MP4 / MOV: hộp đầu là `ftyp` với kích thước hợp lệ (8..256, chia hết 4) và brand chữ in. */
function isMp4(b: Uint8Array): boolean {
  if (b.length < 16 || ascii(b, 4, 8) !== 'ftyp') return false;
  const size = ((b[0]! << 24) | (b[1]! << 16) | (b[2]! << 8) | b[3]!) >>> 0;
  if (size < 16 || size > 256 || size % 4 !== 0 || size > b.length) return false;
  return /^[A-Za-z0-9 ]{4}$/.test(ascii(b, 8, 12));
}

/** Văn bản: UTF-8 hợp lệ trên 64KB đầu, không NUL, mã điều khiển chỉ tab / xuống dòng / form feed. */
function isText(b: Uint8Array): boolean {
  const head = b.subarray(0, 64 * 1024);
  for (const c of head) if (c === 0 || (c < 0x20 && c !== 9 && c !== 10 && c !== 13 && c !== 12)) return false;
  try {
    // Cắt giữa ký tự nhiều byte ở cuối khối 64KB → bỏ tối đa 3 byte cuối khi kiểm.
    new TextDecoder('utf-8', { fatal: true }).decode(head.length === b.length ? head : head.subarray(0, head.length - 3));
    return true;
  } catch {
    return false;
  }
}

/** HTML / SVG / XML có script — không bao giờ được coi là ảnh hay tài liệu an toàn. */
const MARKUP = /^\s*(?:<\?xml[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*<(?:svg|!doctype\s+html|html|script|body|iframe)\b/i;

function ooxml(b: Uint8Array): Sniffed {
  try {
    const names = zipEntries(b, 5000).map((e) => e.name);
    if (!names.includes('[Content_Types].xml')) return 'zip';
    if (names.includes('word/document.xml')) return 'docx';
    if (names.includes('xl/workbook.xml')) return 'xlsx';
    if (names.includes('ppt/presentation.xml')) return 'pptx';
    return 'zip';
  } catch (e) {
    if (e instanceof ZipRefusedError) return e.reason === 'not_zip' ? 'unknown' : 'zip';
    throw e;
  }
}

export function sniff(b: Uint8Array): Sniffed {
  if (starts(b, [0x4d, 0x5a]) || starts(b, [0x7f, 0x45, 0x4c, 0x46]) || starts(b, [0xcf, 0xfa, 0xed, 0xfe]) || starts(b, [0xfe, 0xed, 0xfa, 0xcf]) || starts(b, [0xca, 0xfe, 0xba, 0xbe]) || starts(b, [0x23, 0x21])) return 'executable';
  if (starts(b, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return 'cfb';
  if (starts(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  if (starts(b, [0xff, 0xd8, 0xff])) return 'jpeg';
  if (starts(b, [0x47, 0x49, 0x46, 0x38]) && (b[4] === 0x37 || b[4] === 0x39) && b[5] === 0x61) return 'gif';
  if (ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WEBP') return 'webp';
  // PDF: `%PDF-` trong 1024 byte đầu (đặc tả cho phép rác trước header) — chỉ khi phần trước là văn bản không phải markup.
  const pdfAt = ascii(b, 0, 1024).indexOf('%PDF-');
  if (pdfAt === 0 || (pdfAt > 0 && isText(b.subarray(0, pdfAt)) && !MARKUP.test(ascii(b, 0, pdfAt)))) return 'pdf';
  if (isMp4(b)) return 'mp4';
  if (starts(b, [0x50, 0x4b, 0x03, 0x04]) || starts(b, [0x50, 0x4b, 0x05, 0x06])) return ooxml(b);
  if (isText(b)) {
    const head = new TextDecoder('utf-8').decode(b.subarray(0, 4096)).replace(/^﻿/, '');
    return MARKUP.test(head) ? 'markup' : 'text';
  }
  return 'unknown';
}
