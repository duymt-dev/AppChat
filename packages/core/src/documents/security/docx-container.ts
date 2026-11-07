// Kiểm gói DOCX TRƯỚC khi giải nén (TIP-030b spec 5; ops §3.1): đọc central directory của ZIP bằng tay (không inflate) — số entry ≤ 2000,
// tổng giải nén ≤ 100MB, mỗi entry ≤ 20MB, tỷ lệ nén ≤ 100 (zip bomb), tên entry không đi ngược thư mục / tuyệt đối. Sau đó mới mở bằng
// PizZip (đã có) để kiểm nội dung OOXML: `[Content_Types].xml` + `word/document.xml`, không macro / vbaProject, không mã hoá (gói
// EncryptedPackage của Office), không quan hệ ngoài (TargetMode="External" — ảnh / liên kết tải từ mạng), không đối tượng nhúng
// thực thi (oleObject / activeX / .exe / .bin), không field code tự chạy (DDE / INCLUDETEXT / INCLUDEPICTURE trỏ ra ngoài).
import PizZip from 'pizzip';
import { AppError } from '@appchat/shared';
import { checkZipShape, zipEntries as readZip, ZipRefusedError, type ZipEntry } from '../../kernel/files/zip-guard';

export const DOCX_LIMITS = { maxBytes: 10 * 1024 * 1024, entries: 2000, expanded: 100 * 1024 * 1024, perEntry: 20 * 1024 * 1024, ratio: 100 } as const;

export type DocxRefusal = 'too_large' | 'not_docx' | 'zip_bomb' | 'path_traversal' | 'encrypted' | 'macro' | 'external_relationship' | 'embedded_object' | 'field_code';

const refuse = (reason: DocxRefusal): never => {
  throw new AppError('VALIDATION_FAILED', 422, { file: reason });
};

/** Central directory DOCX (giữ tên cũ cho test / chỗ gọi) — đọc bằng zip-guard của kernel, lỗi đổi về lý do DOCX. */
export function zipEntries(buf: Uint8Array): ZipEntry[] {
  return asDocx(() => readZip(buf, DOCX_LIMITS.entries));
}

function asDocx<T>(fn: () => T): T {
  try {
    return fn();
  } catch (e) {
    if (e instanceof ZipRefusedError) return refuse(e.reason === 'not_zip' ? 'not_docx' : e.reason);
    throw e;
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
  asDocx(() => checkZipShape(entries, DOCX_LIMITS));
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
