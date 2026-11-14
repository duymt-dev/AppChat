// Hợp đồng dữ liệu trí nhớ + insight khách (TIP-015b): khối "AI ghi nhớ" (`GET /v1/contacts/:id/memory`), insight 360° (`insights` trong
// Hồ sơ 360° — công nợ, hợp đồng hiệu lực, đơn / thu gần nhất, LTV, liên kết chứng từ, SLA / CSAT). Phần không có quyền là `null`
// (unavailable — khác 0 thật). Tiền là chuỗi VND. Mock và http cùng schema (crm-shape test).
import { z } from 'zod';

export const memoryFactSchema = z.object({
  memory_id: z.string(),
  fact: z.string(),
  confidence: z.number(),
  source: z.enum(['agent', 'user', 'system']),
  updated_at: z.string(),
});
export const contactMemorySchema = z.object({ items: z.array(memoryFactSchema), cap: z.number().int(), can_edit: z.boolean() });
export type MemoryFactDto = z.infer<typeof memoryFactSchema>;
export type ContactMemoryDto = z.infer<typeof contactMemorySchema>;

const doc = z.object({ id: z.string(), code: z.string(), status: z.string(), amount: z.string(), at: z.string() });
const link = z.object({ id: z.string(), code: z.string(), title: z.string(), status: z.string(), amount: z.string().optional(), at: z.string() });

export const contactInsightsSchema = z.object({
  debt: z.object({ due: z.string(), overdue: z.string(), open: z.number().int() }).nullable(),
  contracts: z.object({ active: z.number().int(), value: z.string(), next_end: z.string() }).nullable(),
  /** null = chưa có; vắng (undefined) = không có quyền xem. */
  recent_order: doc.nullable().optional(),
  recent_payment: doc.nullable().optional(),
  ltv: z.string().nullable(),
  links: z.object({
    quotes: z.array(link).nullable(),
    orders: z.array(link).nullable(),
    appts: z.array(link).nullable(),
    tickets: z.array(link).nullable(),
    sla: z.object({ code: z.string(), result: z.string() }).nullable(),
    csat: z.object({ code: z.string(), score: z.number(), at: z.string() }).nullable(),
  }),
});
export type ContactInsightsDto = z.infer<typeof contactInsightsSchema>;
