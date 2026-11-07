// Ngữ cảnh sửa khách (TIP-025b §D.3) — `GET /v1/contacts/:id/edit-context` = action `contact.get_edit_context`. Chỉ trường người xem
// được thấy (trường ẩn bỏ HẲN + `hidden_fields`, không thay rỗng); `version` để form gửi `if_version`; `editable` / `can_transfer` theo
// quyền hiện tại — watcher / thiếu quyền không có nút ghi. Tên người phụ trách ẩn → null (không bịa).
import { z } from 'zod';

export const CONTACT_EDIT_FIELDS = ['full_name', 'title', 'type', 'group', 'phone', 'email', 'zalo', 'city', 'district', 'address', 'birthday', 'gender', 'source', 'status'] as const;

export const contactEditContextSchema = z.object({
  id: z.string(),
  code: z.string(),
  version: z.number().int(),
  /** Người xem sửa được (crm.edit + scope ghi / owner / collaborator) — watcher false. */
  editable: z.boolean(),
  /** Đổi người phụ trách qua luồng chuyển (crm.reassign) — không qua contact.update. */
  can_transfer: z.boolean(),
  owner_user_id: z.string().nullable(),
  owner_name: z.string().nullable(),
  values: z.record(z.string(), z.string().nullable()),
  custom: z.record(z.string(), z.unknown()),
  hidden_fields: z.array(z.string()),
});
export type ContactEditContextDto = z.infer<typeof contactEditContextSchema>;
