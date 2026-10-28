// Schema dùng chung của chứng từ bán hàng (Báo giá / Đơn / Đề nghị thanh toán) — COMMERCE-DECISIONS §3–5. Không export qua registry.
import { z } from 'zod';

/** Tiền là string VND (Blueprint §4.1). */
export const money = z.string().regex(/^\d+$/);

export const discount = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('pct'), value: z.number().min(0).max(100) }),
  z.object({ kind: z.literal('amount'), value: money }),
]);

/** Dòng chứng từ: đơn giá chưa VAT, thuế theo dòng, chiết khấu theo dòng (% hoặc số tiền). */
export const lineItem = z.object({
  product_id: z.string().optional(),
  name: z.string().trim().min(1).max(200),
  variant: z.string().max(120).optional(),
  qty: z.number().positive(),
  unit_price: money,
  tax_rate: z.union([z.literal(0), z.literal(5), z.literal(8), z.literal(10)]),
  discount: discount.nullable().optional(),
});
