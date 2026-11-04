// Cổng tải tệp chung (TIP-045b annex B, ops §3.1) — FilesService gọi cho MỌI nơi ghi tệp (multipart, server tự sinh PDF / PNG, worker):
// loại tệp xác định từ NỘI DUNG (magic.ts), phải nằm trong danh sách của `purpose`, khớp đuôi tên tệp và mime khai báo (đổi đuôi `.exe`
// → `.pdf`, ảnh giả là SVG / HTML → 415); gói OOXML kiểm hình dạng ZIP + không macro trước khi bất kỳ ai giải nén; giới hạn theo loại
// (ảnh 10MB, mẫu DOCX 10MB, còn lại 25MB). Mime lưu là mime chuẩn theo nội dung, không tin mime trình duyệt. Domain (030b hợp đồng)
// vẫn kiểm sâu hơn sau cổng này.
import { AppError } from '@appchat/shared';
import { sniff, type Sniffed } from './magic';
import { checkZipShape, zipEntries, ZipRefusedError } from './zip-guard';

export const UPLOAD_PURPOSES = ['kb', 'attachment', 'avatar', 'document', 'import'] as const;
export type UploadPurpose = (typeof UPLOAD_PURPOSES)[number];

const MB = 1024 * 1024;
export const UPLOAD_LIMITS = { image: 10 * MB, docxTemplate: 10 * MB, default: 25 * MB } as const;
const OOXML_ZIP = { entries: 5000, expanded: 200 * MB, perEntry: 50 * MB, ratio: 200 } as const;

const IMAGES: Sniffed[] = ['png', 'jpeg', 'gif', 'webp'];
const ALLOWED: Record<UploadPurpose, readonly Sniffed[]> = {
  avatar: IMAGES,
  attachment: [...IMAGES, 'pdf', 'mp4', 'docx', 'xlsx', 'pptx', 'text'],
  document: ['pdf', 'docx', 'png', 'jpeg', 'webp'],
  kb: [...IMAGES, 'pdf', 'mp4', 'docx', 'xlsx', 'pptx', 'text', 'markup'],
  import: ['text', 'xlsx'],
};

/** Đuôi → các loại nội dung hợp lệ. Đuôi không có trong bảng: chỉ cần nội dung thuộc danh sách của purpose. */
const EXT: Record<string, readonly Sniffed[]> = {
  png: ['png'], jpg: ['jpeg'], jpeg: ['jpeg'], gif: ['gif'], webp: ['webp'], pdf: ['pdf'], mp4: ['mp4'], m4v: ['mp4'], mov: ['mp4'],
  docx: ['docx'], xlsx: ['xlsx'], pptx: ['pptx'], csv: ['text'], txt: ['text'], md: ['text'], markdown: ['text'], json: ['text'],
  html: ['markup', 'text'], htm: ['markup', 'text'],
  // Đuôi nguy hiểm / không hỗ trợ — luôn từ chối dù nội dung là gì.
  exe: [], dll: [], bat: [], cmd: [], com: [], msi: [], scr: [], ps1: [], vbs: [], js: [], sh: [], jar: [], apk: [], svg: [], svgz: [],
  docm: [], xlsm: [], pptm: [], dotm: [], doc: [], xls: [], ppt: [],
};

const MIME: Record<Exclude<Sniffed, 'text' | 'markup' | 'zip' | 'executable' | 'cfb' | 'unknown'>, string> = {
  png: 'image/png', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', pdf: 'application/pdf', mp4: 'video/mp4',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};
const TEXT_MIME: Record<string, string> = { csv: 'text/csv', md: 'text/markdown', markdown: 'text/markdown', json: 'application/json', html: 'text/html', htm: 'text/html' };

/** Mime khai báo cụ thể (không phải chung chung) mà mâu thuẫn với nội dung → từ chối. */
const GENERIC = /^(application\/octet-stream|binary\/octet-stream|application\/x-download|)$/i;
function mimeAgrees(declared: string, kind: Sniffed): boolean {
  const m = declared.toLowerCase().split(';')[0]!.trim();
  if (GENERIC.test(m)) return true;
  if (kind === 'text' || kind === 'markup') return m.startsWith('text/') || m === 'application/json' || m === 'application/csv' || m === 'application/vnd.ms-excel';
  if (kind === 'xlsx') return m === MIME.xlsx || m === 'application/vnd.ms-excel';
  if (kind === 'jpeg') return m === 'image/jpeg' || m === 'image/jpg' || m === 'image/pjpeg';
  if (kind === 'mp4') return m === 'video/mp4' || m === 'video/quicktime' || m === 'video/x-m4v';
  return MIME[kind as keyof typeof MIME] === m;
}

const reject = (status: number, reason: string): never => {
  throw new AppError('VALIDATION_FAILED', status, { file: reason });
};

/** Tên tệp an toàn để lưu metadata: NFC, bỏ đường dẫn / mã điều khiển / dấu chấm cuối, ≤ 200 ký tự. */
export function normalizeName(raw: string): string {
  const base = raw.normalize('NFC').split(/[\\/]/).pop() ?? '';
  const clean = base.replace(/[\u0000-\u001f\u007f‪-‮⁦-⁩]/g, '_').replace(/[. ]+$/, '').trim();
  return clean.slice(0, 200) || 'file';
}

export interface GuardedUpload {
  kind: Sniffed;
  mime: string;
  name: string;
}

/** Kiểm một tệp sắp ghi. Lỗi: 413 quá lớn · 415 loại không được phép / không khớp đuôi / mime · 422 rỗng / gói hỏng / macro. */
export function guardUpload(f: { name: string; mime: string; body: Uint8Array; purpose: string }): GuardedUpload {
  if (!(UPLOAD_PURPOSES as readonly string[]).includes(f.purpose)) reject(422, 'invalid_purpose');
  if (!f.body.length) reject(422, 'empty');
  if (f.body.length > UPLOAD_LIMITS.default) reject(413, 'too_large');
  const name = normalizeName(f.name);
  const ext = name.includes('.') ? name.toLowerCase().split('.').pop()! : '';
  const kind = sniff(f.body);
  if (kind === 'executable') reject(415, 'executable');
  if (kind === 'cfb') reject(415, 'legacy_or_encrypted_office');
  if (kind === 'unknown' || kind === 'zip') reject(415, 'unsupported_type');
  if (!ALLOWED[f.purpose as UploadPurpose].includes(kind)) reject(415, 'type_not_allowed');
  const want = EXT[ext];
  if (want && !want.includes(kind)) reject(415, want.length ? 'type_mismatch' : 'extension_not_allowed');
  if (!mimeAgrees(f.mime, kind)) reject(415, 'type_mismatch');
  if (IMAGES.includes(kind) && f.body.length > UPLOAD_LIMITS.image) reject(413, 'too_large');
  if (kind === 'docx' && f.purpose === 'document' && f.body.length > UPLOAD_LIMITS.docxTemplate) reject(413, 'too_large');
  if (kind === 'docx' || kind === 'xlsx' || kind === 'pptx') checkOoxml(f.body);
  const mime = kind === 'text' || kind === 'markup' ? (TEXT_MIME[ext] ?? 'text/plain') : MIME[kind as keyof typeof MIME];
  return { kind, mime, name };
}

const MACRO = /(^|\/)vbaProject\.bin$|(^|\/)vbaData\.xml$|(^|\/)activeX\//i;

function checkOoxml(body: Uint8Array): void {
  try {
    const entries = zipEntries(body, OOXML_ZIP.entries);
    checkZipShape(entries, OOXML_ZIP);
    if (entries.some((e) => MACRO.test(e.name))) reject(422, 'macro');
  } catch (e) {
    if (e instanceof ZipRefusedError) reject(422, e.reason === 'not_zip' ? 'corrupt' : e.reason);
    throw e;
  }
}
