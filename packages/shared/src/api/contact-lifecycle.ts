// Vòng đời khách (TIP-015f) — DTO dùng chung API / actions / web: kết quả xoá / khôi phục, dòng thùng rác (đã che theo chính sách trường).
import { z } from 'zod';

export const contactDeleteResultSchema = z.object({
  deleted: z.boolean(),
  status: z.enum(['deleted', 'already_deleted']),
  receipt_id: z.string(),
  version: z.number().int(),
  restore_until: z.string(),
});
export type ContactDeleteResult = z.infer<typeof contactDeleteResultSchema>;

export const contactRestoreResultSchema = z.object({ contact_id: z.string(), version: z.number().int() });

export const deletedContactSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  phone: z.string().nullable(),
  owner_user_id: z.string().nullable(),
  deleted_at: z.string(),
  restore_until: z.string(),
  version: z.number().int(),
  /** restorable = còn hạn + đủ điều kiện quyền hiện tại; expired = quá 30 ngày; blocked = biên nhận cũ / đã xoá dữ liệu / không ghi được. */
  status: z.enum(['restorable', 'expired', 'blocked']),
});
export type DeletedContact = z.infer<typeof deletedContactSchema>;
export const deletedContactsPageSchema = z.object({ data: z.array(deletedContactSchema), next_cursor: z.string().nullable() });

/** Một loại phụ thuộc trong xem trước xoá (chỉ số đếm — không id / tiền). */
export const lifecycleDependencySchema = z.object({ kind: z.string(), count: z.number().int(), level: z.enum(['block', 'warn']) });
