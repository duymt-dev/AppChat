// Kế hoạch câu trả lời bán hàng có kiểu (TIP-022c §3.5): model KHÔNG viết số tồn / giá / kết quả báo giá vào chữ — chỉ khai sản phẩm khách
// hỏi + số lượng + loại kết luận nó định nói, gợi ý thay thế (id thật đã đọc) và phần dẫn ngắn. Server đối chiếu từng kết luận với quan sát
// tồn kho hiện tại (không bao giờ dùng con số model) rồi dựng câu bằng mẫu đã bản địa hoá. Khối `sales_plan` nằm trong JSON trả lời cuối.
import { z } from 'zod';

export const SALES_PLAN_CLAIMS = ['available_now', 'shortage', 'unknown', 'not_stock_tracked'] as const;
export type SalesPlanClaim = (typeof SALES_PLAN_CLAIMS)[number];

export const MAX_PLAN_ITEMS = 5;
export const MAX_PLAN_ALTERNATIVES = 3;

export const salesPlanSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            product_id: z.string().trim().max(64),
            qty: z.number().int().min(1).max(100_000),
            /** Kết luận model định nói — chỉ để đối chiếu; câu gửi khách luôn theo quan sát server. */
            claim: z.enum(SALES_PLAN_CLAIMS),
          })
          .strict(),
      )
      .max(MAX_PLAN_ITEMS),
    alternatives: z.array(z.string().trim().max(64)).max(MAX_PLAN_ALTERNATIVES).default([]),
    /** Phần dẫn / kết của câu trả lời — KHÔNG chứa số tồn, giá hay khẳng định giao hàng (server kiểm lại). */
    narrative: z.string().max(1000).default(''),
  })
  .strict();
export type SalesPlan = z.infer<typeof salesPlanSchema>;

/** Đọc khối `sales_plan` của output (đã parse JSON). Vắng → null; sai khuôn → 'invalid' (không âm thầm bỏ — chặn tự gửi). */
export function parseSalesPlan(v: unknown): SalesPlan | 'invalid' | null {
  if (v === undefined || v === null) return null;
  const r = salesPlanSchema.safeParse(v);
  if (!r.success || !r.data.items.length) return 'invalid';
  const ids = r.data.items.map((i) => i.product_id);
  if (new Set(ids).size !== ids.length) return 'invalid';
  return r.data;
}
