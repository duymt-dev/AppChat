// Shape đọc domain báo giá (FE ↔ BE — gap-filling §5, TIP-029): GET /v1/quotes (D42), /quotes/:id, /quotes/:id/versions,
// /quotes/meta, công khai /public/quotes/:token. Mock transport (apps/web) và API thật parse cùng schema. Tiền là string VND.
import { z } from 'zod';
import { customValuesSchema } from '../custom-fields/values';
import { QUOTE_STATUSES } from '../sales/quote-state';

const discount = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('pct'), value: z.number().min(0).max(100) }),
  z.object({ kind: z.literal('amount'), value: z.string() }),
]);

export const quoteItemSchema = z.object({
  product_id: z.string().optional(),
  name: z.string(),
  variant: z.string().optional(),
  qty: z.number(),
  unit_price: z.string(),
  tax_rate: z.number().int(),
  discount: discount.nullable().optional(),
});

export const quoteRowSchema = z.object({
  id: z.string(),
  code: z.string(),
  version: z.number().int(),
  root_id: z.string(),
  contact_id: z.string(),
  contact_name: z.string(),
  phone: z.string(),
  /** Khách cũ (đã có đơn / báo giá được chấp nhận trước đó). */
  returning: z.boolean(),
  owner_user_id: z.string(),
  owner_name: z.string(),
  status: z.enum(QUOTE_STATUSES),
  items: z.array(quoteItemSchema),
  header_discount: discount.nullable(),
  valid_days: z.number().int(),
  created_at: z.string(),
  sent_at: z.string().nullable(),
  /** Hạn hiệu lực: đã gửi = cuối ngày (gửi + valid_days); chưa gửi = dự kiến nếu gửi hôm nay. */
  valid_until: z.string(),
  note: z.string(),
  gift: z.string(),
  payment_terms: z.string(),
  comments: z.array(z.object({ who: z.string(), text: z.string(), at: z.string() })),
  /** Gợi ý một dòng ở cột AI (luật theo trạng thái / hạn) — `wait` = cần người xử lý ngay. */
  ai: z.object({ hint: z.string(), wait: z.boolean() }),
  off_catalog: z.boolean(),
  subtotal: z.string(),
  discount_total: z.string(),
  header_discount_total: z.string(),
  tax_total: z.string(),
  total: z.string(),
  lines: z.array(z.object({ gross: z.string(), net: z.string() })),
  approval_reasons: z.array(z.enum(['total', 'discount', 'off_catalog'])),
  /** Đã chuyển sang hợp đồng / đơn (TIP-030 / 031). */
  converted: z.enum(['contract', 'order']).nullable().optional(),
  custom: customValuesSchema.optional(),
});
export type QuoteRow = z.infer<typeof quoteRowSchema>;

export const quotesPageSchema = z.object({
  data: z.array(quoteRowSchema),
  next_cursor: z.string().nullable(),
  meta: z.object({ total: z.number().int(), page: z.number().int(), limit: z.number().int() }),
});

const tuple3 = z.tuple([z.string(), z.string(), z.string()]);
export const quotesMetaSchema = z.object({
  counts: z.record(z.string(), z.number().int()),
  stats: z.object({ total: z.number().int(), approved: z.number().int(), waiting: z.number().int(), close_rate: z.string() }),
  crm_stats: z.array(tuple3),
  timeline: z.array(z.tuple([z.string(), z.string(), z.string(), z.string()])),
  todos: z.array(z.tuple([z.string(), z.boolean(), z.string()])),
  history: z.array(z.tuple([z.string(), z.string()])),
  ai_runs: z.record(z.string(), z.string()),
});

/** Trang xem báo giá công khai (link gửi khách) — không có dữ liệu nội bộ (ghi chú, trao đổi, người phụ trách nội bộ). */
export const publicQuoteSchema = z.object({
  code: z.string(),
  version: z.number().int(),
  status: z.enum(QUOTE_STATUSES),
  business: z.object({ name: z.string(), tax_code: z.string(), address: z.string() }),
  customer: z.string(),
  items: z.array(z.object({ name: z.string(), variant: z.string(), qty: z.number(), unit_price: z.string(), discount: z.string(), tax_rate: z.number().int(), amount: z.string() })),
  subtotal: z.string(),
  discount_total: z.string(),
  tax_total: z.string(),
  total: z.string(),
  total_words: z.string(),
  valid_until: z.string().nullable(),
  payment_terms: z.string(),
  gift: z.string(),
  expired: z.boolean(),
  pdf: z.boolean(),
});
export type PublicQuote = z.infer<typeof publicQuoteSchema>;
