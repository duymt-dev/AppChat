// Cơ hội / Sales Pipeline (TIP-026c, D60, DC-901 — thay mô hình tự do TIP-026b DC253). `amount_vnd` là giá trị KỲ VỌNG (không phải công nợ
// / doanh thu / đã thu); xác suất cố định theo giai đoạn (bảng hằng @appchat/shared — KHÔNG nhập tay; gửi `probability` → 422
// `field_removed`). Ghi / xoá tiền cần thêm quote.create (đọc cần quote.view — giao quyền sẵn có). Agent là nhân viên (DC-922): tạo / sửa
// được cấp như người, cùng luật. Đổi giai đoạn / Thua / Mở lại / phụ trách ở `contact-opportunity-flow.ts`. Không xoá cứng — lưu trữ.
import { z } from 'zod';
import { OPPORTUNITY_AMOUNT_RE, OPPORTUNITY_ITEMS_MAX, OPPORTUNITY_SOURCES, OPPORTUNITY_STAGES } from '@appchat/shared';
import { defineAction } from './define';
import { activitySource } from './crm-schemas';

const uuid = z.string().min(1).max(64); // id như các action CRM khác — server kiểm UUID (sai → 404 / 422)
const ifVersion = z.number().int().positive().optional();
/** Ô bỏ từ 026b: gửi lên → 422 `fields.<ô> = field_removed` (không âm thầm bỏ qua — client cũ biết mà sửa). */
const REMOVED = ['probability', 'quote_id'] as const;
/** Issue mang mã nghiệp vụ làm `code` (executor `zodFields` trả path → code; zod giữ nguyên mã lạ — chỉ kiểu TS đóng tập mã). */
const fail = (ctx: z.RefinementCtx, path: string[], code: string) => ctx.addIssue({ code, path, message: code } as unknown as Parameters<z.RefinementCtx['addIssue']>[0]);
const rejectRemoved = (v: Record<string, unknown>, ctx: z.RefinementCtx) => {
  for (const k of REMOVED) if (k in v) fail(ctx, [k], 'field_removed');
};
const item = z.object({ product_id: uuid.nullable().optional(), name: z.string().trim().min(1).max(200), qty: z.number().int().min(1).max(1_000_000) });
const fields = z.object({
  title: z.string().trim().min(1).max(200),
  need: z.string().max(5000),
  amount_vnd: z.string().regex(OPPORTUNITY_AMOUNT_RE).nullable(),
  items: z.array(item).max(OPPORTUNITY_ITEMS_MAX),
  expected_close_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  source_kind: z.enum(OPPORTUNITY_SOURCES),
  campaign_id: uuid.nullable(),
});
const out = z.object({ opportunity_id: z.string(), version: z.number().int() });

export const contactOpportunityCreate = defineAction({
  id: 'contact_opportunity.create',
  module: 'crm',
  title: 'actions.contact_opportunity.create.title',
  description:
    'Open a sales opportunity on a customer (pipeline stages lead · qualified · demo · quote · negotiation; won needs a real contract / order, lost uses mark_lost). Probability is FIXED by stage — never send one. amount_vnd = expected value (VND integer string, an estimate, not revenue). Pick the starting stage from the conversation like a salesperson would. When the user also wants a quote, create the opportunity FIRST, then open the quote form with ui {"type":"prefill","form":"quote.form","values":{"contact_id":…,"opportunity_id":…}} — no invented prices. Example: {"contact_id":"0190f000-0000-7000-8000-000000000001","title":"Gói chăm sóc da 10 buổi","amount_vnd":"15000000","stage":"qualified","items":[{"name":"HIFU","qty":1}]}',
  input: fields
    .partial()
    .extend({ contact_id: uuid, title: fields.shape.title, stage: z.enum(OPPORTUNITY_STAGES).optional(), owner_user_id: uuid.optional() })
    .merge(activitySource)
    .loose()
    .superRefine(rejectRemoved),
  output: out,
  permission: 'crm.edit',
  risk: 'write',
  agentGrantable: true,
  undo: { windowSec: 86_400 },
  invalidates: ['crm'],
});

export const contactOpportunityUpdate = defineAction({
  id: 'contact_opportunity.update',
  module: 'crm',
  title: 'actions.contact_opportunity.update.title',
  description:
    'Edit an opportunity\'s name, need, expected value, products, expected close date, source or campaign. Stage is NOT editable here (use contact_opportunity.set_stage / mark_lost / reopen). Send if_version from the latest read. Example: {"opportunity_id":"0190f000-0000-7000-8000-0000000000b1","if_version":1,"patch":{"amount_vnd":"48000000","expected_close_date":"2026-11-30"}}',
  input: z
    .object({
      opportunity_id: uuid,
      if_version: ifVersion,
      patch: fields
        .partial()
        .loose()
        .superRefine(rejectRemoved)
        .superRefine((p, ctx) => {
          if ('stage' in p) fail(ctx, ['stage'], 'use_set_stage');
          if (!Object.keys(p).length) fail(ctx, [], 'empty');
        }),
    })
    .loose()
    .superRefine(rejectRemoved),
  output: out,
  permission: 'crm.edit',
  risk: 'write',
  agentGrantable: true,
  undo: { windowSec: 86_400 },
  invalidates: ['crm'],
});

export const contactOpportunityArchive = defineAction({
  id: 'contact_opportunity.archive',
  module: 'crm',
  title: 'actions.contact_opportunity.archive.title',
  description: 'Archive an opportunity (no hard delete; undo within 24h). Refused while it has a live order or a signed contract. Example: {"opportunity_id":"0190f000-0000-7000-8000-0000000000b1","if_version":2}',
  input: z.object({ opportunity_id: uuid, if_version: ifVersion }),
  output: z.object({ opportunity_id: z.string(), version: z.number().int(), archived: z.literal(true) }),
  permission: 'crm.edit',
  risk: 'delete',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['crm'],
});
