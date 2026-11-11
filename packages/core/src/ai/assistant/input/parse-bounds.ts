// Giới hạn + nhận diện loại tệp đầu vào Trợ lý (TIP-023f §1.1, §2.1-2.2): loại theo NỘI DUNG (magic), không theo tên / mime client;
// gói DOCX/XLSX kiểm central directory trước khi giải nén (≤ 2000 entry, ≤ 50 MiB giải nén, tỷ lệ ≤ 100, không đường đi ngược / macro);
// cắt văn bản thành đoạn ≤ 8k ký tự giữ vị trí. Vượt trần → lỗi tường minh (too_large / needs_split), không cắt ngầm.
import { INPUT_MAX_CHARS_PER_FILE, INPUT_MAX_SEGMENT_CHARS, type InputErrorReason, type InputKind, type InputLocator } from '@appchat/shared/input-limits';
import { sniff } from '../../../kernel/files/magic';
import { ZipRefusedError, checkZipShape, zipEntries } from '../../../kernel/files/zip-guard';

export const ARCHIVE_LIMITS = { entries: 2000, expanded: 50 * 1024 * 1024, perEntry: 50 * 1024 * 1024, ratio: 100 } as const;

export class InputParseError extends Error {
  constructor(readonly reason: InputErrorReason) {
    super(reason);
    this.name = 'InputParseError';
  }
}

export interface ParsedPart {
  locator: InputLocator;
  text?: string;
  /** Phần ảnh: nội dung là chính tệp gốc (đã kiểm), không chép bytes vào bảng phần. */
  image?: true;
}

/** Loại tệp theo nội dung. Văn bản thuần phân biệt md / csv / html / eml theo đuôi CHỈ khi nội dung là văn bản (đuôi không nâng quyền). */
export function detectKind(body: Buffer, name: string): InputKind | null {
  const s = sniff(body);
  const ext = (name.toLowerCase().split('.').pop() ?? '').trim();
  if (s === 'png' || s === 'jpeg' || s === 'pdf' || s === 'docx' || s === 'xlsx') return s;
  if (s === 'markup') return ext === 'eml' ? 'eml' : 'html';
  if (s !== 'text') return null;
  if (ext === 'eml' || /^(received|from|subject|mime-version|return-path|date|message-id):/im.test(body.subarray(0, 2048).toString('utf8'))) return ext === 'eml' ? 'eml' : ext === 'csv' ? 'csv' : ext === 'md' ? 'markdown' : 'text';
  if (ext === 'csv') return 'csv';
  if (ext === 'md' || ext === 'markdown') return 'markdown';
  if (ext === 'html' || ext === 'htm') return 'html';
  return 'text';
}

/** DOCX/XLSX: kiểm hình dạng ZIP trước khi thư viện giải nén; macro (vbaProject) / quan hệ ngoài bị từ chối. */
export function preflightArchive(body: Buffer): void {
  try {
    const entries = zipEntries(body, ARCHIVE_LIMITS.entries);
    checkZipShape(entries, ARCHIVE_LIMITS);
    if (entries.some((e) => /vbaProject\.bin$/i.test(e.name))) throw new InputParseError('archive_bounds');
  } catch (e) {
    if (e instanceof ZipRefusedError) throw new InputParseError(e.reason === 'not_zip' ? 'corrupt' : e.reason === 'encrypted' ? 'encrypted' : 'archive_bounds');
    throw e;
  }
}

/** Cắt một khối văn bản (một trang / đoạn / bản ghi) thành đoạn ≤ 8k ký tự, cùng locator (thêm `part` khi bị chia). */
export function segment(locator: InputLocator, text: string): ParsedPart[] {
  const t = text.trim();
  if (!t) return [];
  if (t.length <= INPUT_MAX_SEGMENT_CHARS) return [{ locator, text: t }];
  const out: ParsedPart[] = [];
  for (let i = 0, n = 1; i < t.length; i += INPUT_MAX_SEGMENT_CHARS, n++) out.push({ locator: { ...locator, part: String(n) }, text: t.slice(i, i + INPUT_MAX_SEGMENT_CHARS) });
  return out;
}

/** Tổng ký tự của tệp vượt 200k → needs_split (không cắt ngầm rồi giả là đọc hết). */
export function assertCharBudget(parts: readonly ParsedPart[]): void {
  let n = 0;
  for (const p of parts) n += p.text?.length ?? 0;
  if (n > INPUT_MAX_CHARS_PER_FILE) throw new InputParseError('needs_split');
}
