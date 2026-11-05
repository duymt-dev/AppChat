// Tệp đính kèm của Trợ lý (TIP-023c 8c) — phần dùng chung phía trình duyệt: luật chọn tệp (mime / cỡ / số lượng, khớp guard server
// `genui/attachments.ts` — server vẫn kiểm lại, đây chỉ để báo sớm) và registry "extension" UI để module khác (038b TransferPanel…) đăng
// ký nhãn gợi ý theo mime. Không import feature nào; không giữ URL lưu trữ (chỉ `file_id`).
export const ATTACH_MAX_FILES = 10;
export const ATTACH_MAX_BYTES = 25 * 1024 * 1024;
export const ATTACH_MIMES: readonly string[] = [
  'image/',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
/** Giá trị `accept` cho <input type=file>. */
export const ATTACH_ACCEPT = ATTACH_MIMES.map((m) => (m.endsWith('/') ? `${m}*` : m)).join(',');

export type AttachReject = 'mime' | 'too_large' | 'too_many';

const mimeOk = (mime: string) => ATTACH_MIMES.some((m) => (m.endsWith('/') ? mime.startsWith(m) : mime === m));

/** Lý do không nhận tệp (null = nhận). `count` = số tệp đang có. */
export function rejectReason(f: Pick<File, 'type' | 'size'>, count: number): AttachReject | null {
  if (count >= ATTACH_MAX_FILES) return 'too_many';
  if (!mimeOk(f.type)) return 'mime';
  if (f.size > ATTACH_MAX_BYTES) return 'too_large';
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
