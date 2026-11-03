// Kiểm gói DOCX TRƯỚC khi giải nén (TIP-030b spec 5; ops §3.1): đọc central directory của ZIP bằng tay (không inflate) — số entry ≤ 2000,
// tổng giải nén ≤ 100MB, mỗi entry ≤ 20MB, tỷ lệ nén ≤ 100 (zip bomb), tên entry không đi ngược thư mục / tuyệt đối. Sau đó mới mở bằng
// PizZip (đã có) để kiểm nội dung OOXML: `[Content_Types].xml` + `word/document.xml`, không macro / vbaProject, không mã hoá (gói
// EncryptedPackage của Office), không quan hệ ngoài (TargetMode="External" — ảnh / liên kết tải từ mạng), không đối tượng nhúng
// thực thi (oleObject / activeX / .exe / .bin), không field code tự chạy (DDE / INCLUDETEXT / INCLUDEPICTURE trỏ ra ngoài).
import PizZip from 'pizzip';
import { AppError } from '@appchat/shared';

export const DOCX_LIMITS = { maxBytes: 10 * 1024 * 1024, entries: 2000, expanded: 100 * 1024 * 1024, perEntry: 20 * 1024 * 1024, ratio: 100 } as const;

export type DocxRefusal = 'too_large' | 'not_docx' | 'zip_bomb' | 'path_traversal' | 'encrypted' | 'macro' | 'external_relationship' | 'embedded_object' | 'field_code';

const refuse = (reason: DocxRefusal): never => {
  throw new AppError('VALIDATION_FAILED', 422, { file: reason });
};

const EOCD_SIG = 0x06054b50;
const CEN_SIG = 0x02014b50;

interface Entry {
  name: string;
  compressed: number;
  size: number;
}

/** Đọc central directory (không giải nén). ZIP64 / đa đĩa → coi là không hợp lệ (DOCX ≤ 10MB không cần). */
export function zipEntries(buf: Uint8Array): Entry[] {
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  // EOCD ở cuối, có thể kèm comment ≤ 65535 byte.
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 0xffff); i--) {
    if (v.getUint32(i, true) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) refuse('not_docx');
  const count = v.getUint16(eocd + 10, true);
  const cdSize = v.getUint32(eocd + 12, true);
  const cdOff = v.getUint32(eocd + 16, true);
  if (count === 0xffff || cdOff === 0xffffffff || cdOff + cdSize > buf.length) refuse('not_docx');
  if (count > DOCX_LIMITS.entries) refuse('zip_bomb');
  const out: Entry[] = [];
  let p = cdOff;
  const dec = new TextDecoder('utf-8', { fatal: false });
  for (let n = 0; n < count; n++) {
    if (p + 46 > buf.length || v.getUint32(p, true) !== CEN_SIG) refuse('not_docx');
    const compressed = v.getUint32(p + 20, true);
    const size = v.getUint32(p + 24, true);
    const nameLen = v.getUint16(p + 28, true);
    const extraLen = v.getUint16(p + 30, true);
    const commentLen = v.getUint16(p + 32, true);
    if (compressed === 0xffffffff || size === 0xffffffff) refuse('zip_bomb');
    out.push({ name: dec.decode(buf.subarray(p + 46, p + 46 + nameLen)), compressed, size });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

/** Giới hạn trước inflate: tổng / từng entry / tỷ lệ nén / tên entry an toàn. */
export function checkZipShape(entries: readonly Entry[]): void {
  let total = 0;
  for (const e of entries) {
    if (e.name.startsWith('/') || e.name.includes('\\') || /^[a-z]:/i.test(e.name) || e.name.split('/').includes('..')) refuse('path_traversal');
    if (e.size > DOCX_LIMITS.perEntry) refuse('zip_bomb');
    if (e.compressed > 0 && e.size / e.compressed > DOCX_LIMITS.ratio) refuse('zip_bomb');
    if (e.compressed === 0 && e.size > 0) refuse('zip_bomb');
    total += e.size;
    if (total > DOCX_LIMITS.expanded) refuse('zip_bomb');
  }
}

const MACRO = /(^|\/)vbaProject\.bin$|macroEnabled|vbaData\.xml$/i;
const EMBED = /(^|\/)(embeddings|activeX)\/|\.(exe|bin|dll|com|bat|cmd|js|vbs|ps1|scr|msi)$/i;
const EXTERNAL = /TargetMode\s*=\s*"External"/i;
// Field code tự chạy / tải ngoài: DDE, DDEAUTO, INCLUDETEXT, INCLUDEPICTURE, IMPORT, LINK (instrText hoặc fldSimple).
const FIELD = /(?:<w:instrText[^>]*>|w:instr=")\s*(DDE|DDEAUTO|INCLUDETEXT|INCLUDEPICTURE|IMPORT|LINK)\b/i;

/** Kiểm toàn bộ gói DOCX; trả PizZip đã mở để đọc tiếp. Mọi từ chối → 422 `{ file: <lý do> }`. */
export function inspectDocx(body: Uint8Array): PizZip {
  if (body.length > DOCX_LIMITS.maxBytes) refuse('too_large');
  // Office mã hoá = tệp OLE (CFB) chứa EncryptedPackage, không phải ZIP.
  if (body.length >= 8 && body[0] === 0xd0 && body[1] === 0xcf && body[2] === 0x11 && body[3] === 0xe0) refuse('encrypted');
  if (!(body[0] === 0x50 && body[1] === 0x4b)) refuse('not_docx');
  const entries = zipEntries(body);
  checkZipShape(entries);
  let zip: PizZip;
  try {
    zip = new PizZip(body);
  } catch {
    return refuse('not_docx');
  }
  const names = Object.keys(zip.files);
  const types = zip.file('[Content_Types].xml')?.asText();
  if (!types || !zip.file('word/document.xml')) refuse('not_docx');
  if (!/wordprocessingml\.document\.main\+xml/.test(types!)) refuse(/macroEnabled/i.test(types!) ? 'macro' : 'not_docx');
  if (names.some((n) => MACRO.test(n)) || MACRO.test(types!)) refuse('macro');
  if (names.some((n) => n.toLowerCase().includes('encryptedpackage'))) refuse('encrypted');
  if (names.some((n) => EMBED.test(n))) refuse('embedded_object');
  for (const n of names.filter((x) => x.endsWith('.rels'))) if (EXTERNAL.test(zip.file(n)!.asText())) refuse('external_relationship');
  for (const n of names.filter((x) => /^word\/[^/]+\.xml$/.test(x))) if (FIELD.test(zip.file(n)!.asText())) refuse('field_code');
  return zip;
}
