// Chính sách bán hàng (TIP-032b P1, COMMERCE §3 Q5): `GET /v1/settings/sales-policy` — ngưỡng duyệt báo giá của workspace (Owner chỉnh qua
// `sales_settings.update`) + trần giảm giá agent đang áp từ AI Governance (chỉ đọc ở đây). Tiền là string VND.
import { z } from 'zod';

export const salesPolicySchema = z.object({
  approval_total_vnd: z.string(),
  approval_discount_pct: z.number().int().min(0).max(100),
  /** Trần giảm giá báo giá do agent / Trợ lý / tác vụ tạo (AI Governance) — vượt thì luôn duyệt. */
  agent_max_discount_pct: z.number().min(0).max(100),
  version: z.number().int(),
  can_edit: z.boolean(),
});
export type SalesPolicyDto = z.infer<typeof salesPolicySchema>;
