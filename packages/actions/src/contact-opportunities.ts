// Cơ hội bán hàng trên khách (TIP-026b DC253). `amount_vnd` là giá trị KỲ VỌNG (không phải công nợ / doanh thu / đã thu), `probability` là
// ước lượng người nhập (không phải độ tin cậy của model). Ghi / xoá tiền cần thêm quote.create (đọc cần quote.view — giao quyền sẵn có,
// không thêm quyền mới). Đổi giai đoạn won / lost không đổi giai đoạn khách, đơn, kho, điểm hay đề nghị thanh toán. Không xoá cứng — lưu trữ.
import { z } from 'zod';
import { CONTACT_OPPORTUNITY_STAGES, OPPORTUNITY_AMOUNT_RE, probabilityOk } from '@appchat/shared';
import { defineAction } from './define';
import { activitySource } from './crm-schemas';

const uuid = z.string().uuid();
const ifVersion = z.number().int().positive().optional();
const fields = z.object({
  title: z.string().trim().min(1).max(200),
  need: z.string().max(5000),
  amount_vnd: z.string().regex(OPPORTUNITY_AMOUNT_RE).nullable(),
  stage: z.enum(CONTACT_OPPORTUNITY_STAGES),
  probability: z.number().refine(probabilityOk, { message: 'probability' }).nullable(),
  expected_close_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  quote_id: uuid.nullable(),
});
const out = z.object({ opportunity_id: z.string(), version: z.number().int() });

export const contactOpportunityCreate = defineAction({
  id: 'contact_opportunity.create',
  module: 'crm',
  title: 'actions.contact_opportunity.create.title',
  description:
    'Record a sales opportunity on a customer: need, expected value (VND integer string — an estimate, not revenue), user-entered probability, expected close date. Never guess a probability. Example: {"contact_id":"0190f000-0000-7000-8000-000000000001","title":"Gói chăm sóc da 10 buổi","need":"Muốn bắt đầu tháng sau"}',
  input: fields.partial().extend({ contact_id: uuid, title: fields.shape.title }).merge(activitySource),
  output: out,
  permission: 'crm.edit',
  risk: 'write',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['crm'],
});

export const contactOpportunityUpdate = defineAction({
  id: 'contact_opportunity.update',
  module: 'crm',
  title: 'actions.contact_opportunity.update.title',
  description: 'Edit an opportunity (any field, including stage won / lost or reopen). Send if_version from the latest read. Example: {"opportunity_id":"0190f000-0000-7000-8000-0000000000b1","if_version":1,"patch":{"stage":"proposal"}}',
  input: z.object({ opportunity_id: uuid, if_version: ifVersion, patch: fields.partial().refine((p) => Object.keys(p).length > 0, { message: 'empty' }) }),
  output: out,
  permission: 'crm.edit',
  risk: 'write',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['crm'],
});

export const contactOpportunityArchive = defineAction({
  id: 'contact_opportunity.archive',
  module: 'crm',
  title: 'actions.contact_opportunity.archive.title',
  description: 'Archive an opportunity (no hard delete; undo within 24h). Example: {"opportunity_id":"0190f000-0000-7000-8000-0000000000b1","if_version":2}',
  input: z.object({ opportunity_id: uuid, if_version: ifVersion }),
  output: z.object({ opportunity_id: z.string(), version: z.number().int(), archived: z.literal(true) }),
  permission: 'crm.edit',
  risk: 'write',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['crm'],
});
