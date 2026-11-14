// Tệp đính kèm của Trợ lý (TIP-023c 8c) — phần dùng chung phía trình duyệt: luật chọn tệp (mime / cỡ / số lượng, khớp guard server
// `genui/attachments.ts` — server vẫn kiểm lại, đây chỉ để báo sớm) và registry "extension" UI để module khác (038b TransferPanel…) đăng
// ký nhãn gợi ý theo mime. Không import feature nào; không giữ URL lưu trữ (chỉ `file_id`). TIP-023f: giới hạn theo đầu vào đã chuẩn bị.
import { INPUT_EXTENSIONS, INPUT_MAX_ATTACHMENTS, INPUT_MAX_FILE_BYTES, INPUT_MAX_TOTAL_BYTES } from '@appchat/shared';

// TIP-023f §1.1: giới hạn bản nháp = giới hạn đầu vào server (5 tệp, 25 MiB / tệp, 50 MiB tổng) — server vẫn kiểm lại theo NỘI DUNG.
export const ATTACH_MAX_FILES = INPUT_MAX_ATTACHMENTS;
export const ATTACH_MAX_BYTES = INPUT_MAX_FILE_BYTES;
export const ATTACH_MAX_TOTAL = INPUT_MAX_TOTAL_BYTES;
/** Mime còn đi kèm metadata `file_id` cho extension domain (038b nhập CSV / XLSX…) — nội dung đi qua artifact đã chuẩn bị. */
export const ATTACH_MIMES: readonly string[] = [
  'image/',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
/** Giá trị `accept` cho <input type=file>: đúng phần mở rộng đọc được (TXT/MD/HTML, PDF, DOCX, CSV/XLSX, PNG/JPEG, .eml). */
export const ATTACH_ACCEPT = INPUT_EXTENSIONS.join(',');

export type AttachReject = 'mime' | 'too_large' | 'too_many' | 'total';

const extOf = (name: string) => name.slice(name.lastIndexOf('.')).toLowerCase();
const mimeOk = (mime: string) => ATTACH_MIMES.some((m) => (m.endsWith('/') ? mime.startsWith(m) : mime === m));
/** Tệp có đi kèm metadata cho extension domain (giữ hợp đồng 023c / 038b). */
export const carriesFileId = (mime: string) => mimeOk(mime);

/** Lý do không nhận tệp (null = nhận). `count` / `total` = số tệp / tổng byte đang có. Tên tệp chỉ để báo sớm — server nhận diện theo nội dung. */
export function rejectReason(f: Pick<File, 'name' | 'size'>, count: number, total = 0): AttachReject | null {
  if (count >= ATTACH_MAX_FILES) return 'too_many';
  if (!(INPUT_EXTENSIONS as readonly string[]).includes(extOf(f.name))) return 'mime';
  if (f.size > ATTACH_MAX_BYTES) return 'too_large';
  if (total + f.size > ATTACH_MAX_TOTAL) return 'total';
  return null;
}

export interface AttachmentUiExtension {
  key: string;
  mimes: readonly string[];
  /** Khoá i18n nhãn gợi ý (vd. "Nhập khách hàng từ tệp này"). */
  labelKey: string;
}

const uiExtensions = new Map<string, AttachmentUiExtension>();

export function registerAttachmentUi(e: AttachmentUiExtension): () => void {
  uiExtensions.set(e.key, e);
  return () => void uiExtensions.delete(e.key);
}

export const attachmentUiFor = (mime: string): AttachmentUiExtension[] =>
  [...uiExtensions.values()].filter((e) => e.mimes.some((m) => (m.endsWith('/') ? mime.startsWith(m) : mime === m)));
