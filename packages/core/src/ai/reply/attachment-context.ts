// Ngữ cảnh tệp đính kèm cho agent trực kênh (TIP-022b C): metadata có kiểu (tên an toàn / mime / cỡ / tham chiếu tệp, đọc được không +
// lý do) — KHÔNG giả vờ `[file]` là nội dung đã đọc. Kênh hiện chưa có năng lực trích xuất nội dung đã cấp quyền cho mục đích trả lời khách
// (không OCR / đa phương thức, không đưa byte / URL thô vào model) → `attachment_unreadable`: model được dặn không suy ra nội dung, nhân
// viên / bản nháp nhận hướng dẫn. Nội dung tệp không đọc được không thể làm căn cứ chấp nhận báo giá / huỷ lịch / chi tiết khiếu nại.
type Raw = { url?: unknown; mime?: unknown; name?: unknown; size?: unknown; fileId?: unknown };

export interface AttachmentInfo {
  name: string;
  mime: string;
  size: number | null;
  file_ref: string | null;
  readable: false;
  reason: 'attachment_unreadable';
}

/** Tên tệp an toàn để hiển thị / đưa vào prompt: bỏ đường dẫn + ký tự điều khiển, ≤ 80 ký tự. Không có URL. */
const safeName = (v: unknown) => (typeof v === 'string' ? v.split(/[\\/]/).pop()!.replace(/[\u0000-\u001f<>]/g, '').slice(0, 80) : '') || 'file';

export function attachmentInfo(raw: unknown): AttachmentInfo[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 10).map((a: Raw) => ({
    name: safeName(a.name),
    mime: typeof a.mime === 'string' ? a.mime.slice(0, 80) : 'application/octet-stream',
    size: typeof a.size === 'number' ? a.size : null,
    file_ref: typeof a.fileId === 'string' ? a.fileId : null,
    readable: false,
    reason: 'attachment_unreadable',
  }));
}

/** Dòng tin cho model: `[tệp không đọc được: hop-dong.pdf · application/pdf]` thay vì `[file]`. */
export function attachmentLine(kind: string, body: string, raw: unknown): string {
  const files = attachmentInfo(raw);
  if (!files.length) return body ? `[${kind}] ${body}` : `[${kind}]`;
  const list = files.map((f) => `${f.name} · ${f.mime}`).join(', ');
  return `[${kind} — attachment_unreadable: ${list}]${body ? ` ${body}` : ''}`;
}

export const ATTACHMENT_RULE =
  '# TỆP ĐÍNH KÈM\nTin có `attachment_unreadable` là tệp bạn KHÔNG đọc được nội dung. Không suy đoán nội dung tệp; không dựa vào tệp để chấp nhận / từ chối báo giá, huỷ / đổi lịch hay ghi chi tiết khiếu nại. Hỏi khách mô tả bằng chữ hoặc chuyển nhân viên.';
