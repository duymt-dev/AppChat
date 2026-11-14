// Liệu trình của khách — DTO dùng chung (TIP-033b §4.2): GET /contacts/:id/packages, action package.list_for_contact, thẻ 360. Không số
// tiền; `remaining` = max(total − used, 0) KHÔNG phải "còn đặt được"; `order_id` chỉ có khi người xem đọc được đơn (order.view + scope).
import { z } from 'zod';
import { PACKAGE_STATUSES } from '../sales/invoice-state';

export const customerPackageItemSchema = z.object({
  id: z.string(),
  contact_id: z.string(),
  product_id: z.string(),
  name: z.string(),
  total: z.number().int(),
  used: z.number().int(),
  remaining: z.number().int(),
  status: z.enum(PACKAGE_STATUSES),
  expires_at: z.string().nullable(),
  order_id: z.string().nullable(),
});
export type CustomerPackageItem = z.infer<typeof customerPackageItemSchema>;

export const customerPackagesPageSchema = z.object({ data: z.array(customerPackageItemSchema), next_cursor: z.string().nullable() });
