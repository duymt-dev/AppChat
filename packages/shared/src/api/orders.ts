// Shape đọc domain đơn hàng (FE ↔ BE — gap-filling §5, TIP-031): GET /v1/orders (D42), /orders/:id, /orders/meta (?order_id= kèm thẻ
// CRM / nhận định / tệp của đơn đó). Mock transport (apps/web) và API thật parse cùng schema. Tiền là string VND.
import { z } from 'zod';
import { customValuesSchema } from '../custom-fields/values';
import { ORDER_SOURCES, ORDER_STATUSES, PAY_STATUSES } from '../orders/order-state';
import { quoteItemSchema } from './quotes';

const discount = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('pct'), value: z.number().min(0).max(100) }),
  z.object({ kind: z.literal('amount'), value: z.string() }),
]);

export const shippingSchema = z.object({
  carrier: z.string(),
  tracking: z.string(),
  eta: z.string(),
  address: z.string(),
  receiver: z.string(),
  receiver_phone: z.string(),
});

export const orderEventSchema = z.object({
  type: z.string(),
  at: z.string(),
  actor: z.string(),
  amount: z.string().optional(),
  points: z.number().int().optional(),
  reason: z.string().optional(),
});

export const orderRowSchema = z.object({
  id: z.string(),
  code: z.string(),
  source: z.enum(ORDER_SOURCES),
  /** Kênh khách đặt (hội thoại nguồn) — `marketplace` cho đơn sàn. */
  channel: z.string(),
  external: z.object({ platform: z.string(), external_id: z.string(), platform_status: z.string() }).nullable(),
  locked_lines: z.boolean(),
  contact_id: z.string(),
  contact_name: z.string(),
  phone: z.string(),
  owner_user_id: z.string(),
  owner_name: z.string(),
  /** Người phụ trách vận hành (TIP-032c) — khác người tạo `owner_*` (doanh số, bất biến). */
  assigned_user_id: z.string(),
  assigned_name: z.string(),
  /** Phiên bản dòng — gửi lại làm `if_version` khi sửa. */
  version: z.number().int(),
  quote_id: z.string().nullable(),
  quote_code: z.string(),
  contract_id: z.string().nullable(),
  contract_code: z.string(),
  status: z.enum(ORDER_STATUSES),
  pay_status: z.enum(PAY_STATUSES),
  deposit_required: z.boolean(),
  deposit_amount: z.string(),
  paid_total: z.string(),
  refund_pending: z.boolean(),
  items: z.array(quoteItemSchema),
  header_discount: discount.nullable(),
  subtotal: z.string(),
  discount_total: z.string(),
  tax_total: z.string(),
  total: z.string(),
  created_at: z.string(),
  cancel_reason: z.string(),
  points_earned: z.number().int(),
  shipping: shippingSchema,
  note: z.string(),
  events: z.array(orderEventSchema),
  ai: z.object({ hint: z.string(), wait: z.boolean() }),
  custom: customValuesSchema.optional(),
});
export type OrderRow = z.infer<typeof orderRowSchema>;

export const ordersPageSchema = z.object({
  data: z.array(orderRowSchema),
  next_cursor: z.string().nullable(),
  meta: z.object({ total: z.number().int(), page: z.number().int(), limit: z.number().int() }),
});

export const ordersMetaSchema = z.object({
  counts: z.record(z.string(), z.number().int()),
  stats: z.object({ total: z.number().int(), paid: z.number().int(), pending: z.number().int(), revenue: z.string() }),
  crm: z.object({ ltv: z.string(), total: z.number().int(), tier: z.string(), points: z.number().int() }),
  insight: z.string(),
  files: z.array(z.object({ name: z.string(), ext: z.string(), by: z.string(), at: z.string(), size: z.string() })),
  ai_runs: z.record(z.string(), z.string()),
});
