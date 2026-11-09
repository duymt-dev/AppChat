// Ràng buộc xem trước bắt buộc (TIP-015c §1.3): action trong MANDATORY_PREVIEW_ACTIONS (policy.ts) đã qua cổng xem trước chung của
// executor (confirm_token khoá action + input + actor + workspace, một lần, 10 phút — kernel/actions/confirm-token.ts). Lớp này chỉ
// thêm một bước: xác nhận lại input xem trước còn ĐÚNG với trạng thái sống NGAY TRONG transaction thực thi (không tin token cũ nếu
// version / revision đã đổi giữa lúc xem trước và lúc xác nhận) — "đổi sự kiện → 409 / xem trước lại", không âm thầm mở rộng phạm vi.
import { AppError } from '@appchat/shared';

/** So input đã xem trước (if_version / inventory_revision…) với giá trị đọc được NGAY trong transaction thực thi. Lệch → 409. */
export function assertPreviewStillCurrent(fieldsAtPreview: Record<string, string | number>, fieldsNow: Record<string, string | number>): void {
  for (const k of Object.keys(fieldsAtPreview)) {
    if (fieldsAtPreview[k] !== fieldsNow[k]) {
      throw new AppError('CONFLICT', 409, { [k]: 'changed' }, `${k} đã đổi kể từ lúc xem trước — xem trước lại`);
    }
  }
}
