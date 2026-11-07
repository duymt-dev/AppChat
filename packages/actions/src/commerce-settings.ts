// Chính sách bán hàng (TIP-032b P1, COMMERCE §3 Q5 "cấu hình được"): ngưỡng duyệt báo giá của workspace. Chỉ Chủ sở hữu (luật đã chốt —
// kiểm ở handler bằng owner authority, không theo tên vai trò); CAS `if_version` (concurrency §1). Mặc định luật 20.000.000đ / 5% không đổi.
import { z } from 'zod';
import { defineAction } from './define';

export const salesSettingsUpdate = defineAction({
  id: 'sales_settings.update',
  module: 'sales',
  title: 'actions.sales_settings.update.title',
  description:
    'Owner only: change the quote approval thresholds (quote total above which approval is required, and max discount % without approval). Agent discount ceiling stays in AI Governance. Example: {"if_version":1,"approval_total_vnd":"30000000","approval_discount_pct":5}',
  input: z
    .object({
      if_version: z.number().int().min(0),
      approval_total_vnd: z.string().regex(/^\d{1,15}$/).optional(),
      approval_discount_pct: z.number().int().min(0).max(100).optional(),
    })
    .refine((v) => v.approval_total_vnd !== undefined || v.approval_discount_pct !== undefined, { message: 'empty patch', path: ['approval_total_vnd'] }),
  output: z.object({ version: z.number().int(), approval_total_vnd: z.string(), approval_discount_pct: z.number().int() }),
  permission: 'settings.manage',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['settings', 'quotes'],
});
