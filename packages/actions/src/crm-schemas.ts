// Schema dùng chung của domain crm (không export từ file domain — action-registry: file domain chỉ export ActionDef).
import { z } from 'zod';
import { customValuesSchema } from '@appchat/shared';

const userId = z.string().min(1);

export const contactFields = z.object({
  full_name: z.string().trim().min(1).max(120),
  title: z.string().max(80).optional(),
  type: z.enum(['individual', 'business', 'household']).optional(),
  group: z.enum(['vip', 'loyal', 'new', 'potential']).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional().or(z.literal('')),
  zalo: z.string().max(30).optional(),
  city: z.string().max(60).optional(),
  district: z.string().max(60).optional(),
  address: z.string().max(200).optional(),
  /** YYYY-MM-DD; rỗng = xoá. */
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  gender: z.enum(['male', 'female', 'other']).optional().or(z.literal('')),
  source: z.enum(['zalo_personal', 'email', 'website', 'manual', 'referral']).optional(),
  status: z.enum(['active', 'potential', 'inactive']).optional(),
  owner_user_id: userId.optional(),
  note: z.string().max(2000).optional(),
  /** Trường tuỳ biến (D56) — validate theo định nghĩa ở Executor. */
  custom: customValuesSchema.optional(),
});

/** Sửa hàng loạt (TIP-045b annex D): mọi trường `contact.update` được sửa, TRỪ đổi người phụ trách (action riêng `contact.reassign` /
 *  duyệt chuyển chủ) — không "lén" đổi chủ / xoá / tiền qua patch chung. */
export const contactBulkPatch = contactFields.omit({ full_name: true, owner_user_id: true, phone: true, email: true }).partial().extend({
  add_tags: z.array(z.string().min(1).max(40)).max(10).optional(),
  remove_tags: z.array(z.string().min(1).max(40)).max(10).optional(),
});

/** Nguồn hội thoại / tin tuỳ chọn của hoạt động CRM (TIP-026b) — server kiểm thuộc đúng khách + người gọi thấy được. */
export const activitySource = z.object({ source_conversation_id: z.string().min(1).max(64).optional(), source_message_id: z.string().min(1).max(64).optional() });
