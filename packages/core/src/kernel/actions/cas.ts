// Khoá lạc quan (domain/concurrency.md §1, TIP-003e): action sửa nhận `if_version?`; có mà lệch version của dòng ĐÃ khoá (`FOR UPDATE`
// trong cùng transaction — tương đương `UPDATE … WHERE version = $v` trả 0 dòng) → 409 STALE_VERSION kèm version hiện tại để FE tải lại.
// Không gửi `if_version` → giữ hành vi cũ (Trợ lý / agent / job ghi theo bản mới nhất). Version tăng ở trigger DB, không ở handler.
import { AppError } from '@appchat/shared';

export function assertIfVersion(current: number, ifVersion: number | undefined): void {
  if (ifVersion !== undefined && ifVersion !== current) throw new AppError('STALE_VERSION', 409, { version: String(current) });
}
