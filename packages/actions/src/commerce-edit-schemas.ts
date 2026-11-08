// Sửa hợp đồng / đơn (TIP-032c, COMMERCE §4b / §8b): người tạo (`owner_user_id`, doanh số) bất biến sau khi tạo — gửi lại đúng giá trị cũ
// được bỏ qua (tương thích form cũ), giá trị khác / rỗng / null → 422 immutable. Người phụ trách vận hành là trường riêng
// `assigned_user_id` (UUID thành viên hoặc null = chưa giao). `if_version` = phiên bản dòng đã đọc (lệch → 409 STALE_VERSION).
import { z } from 'zod';

export const ifVersion = z.number().int().positive().optional();
export const assignedUserId = z.string().min(1).max(64).nullable().optional();
/** Người tạo trong patch sửa: chấp nhận cả null / chuỗi rỗng để server trả 422 immutable rõ ràng thay vì lỗi schema. */
export const ownerEcho = z.string().max(64).nullable().optional();
