// Luồng cơ hội (TIP-026c §2, COMMERCE §8, DC-901): đổi giai đoạn tay, Thua (bắt buộc lý do — từ chối báo giá đã gửi cùng transaction),
// Mở lại, đổi phụ trách, đọc theo khách / chi tiết drawer. Agent là nhân viên (DC-922): cấp được như người, cùng luật (won thiếu chứng
// từ → 422, thiếu lý do Thua → 422); delegate = quyền agent ∩ quyền người ra lệnh, kiểm mỗi lần gọi (D51).
import { z } from 'zod';
import { OPPORTUNITY_LOST_REASONS, OPPORTUNITY_STAGES, opportunityDetailSchema, opportunityPageSchema } from '@appchat/shared';
import { defineAction } from './define';

const uuid = z.string().min(1).max(64);
const ifVersion = z.number().int().positive().optional();
const out = z.object({ opportunity_id: z.string(), version: z.number().int(), stage: z.enum(OPPORTUNITY_STAGES) });

export const contactOpportunitySetStage = defineAction({
  id: 'contact_opportunity.set_stage',
  module: 'crm',
  title: 'actions.contact_opportunity.set_stage.title',
  description:
    'Move an opportunity to another pipeline stage, forward or back (lead · qualified · demo · quote · negotiation · won). Probability follows the stage automatically. "won" only when the opportunity already has a signed contract or an order (else 422 won_needs_document); for a lost deal use contact_opportunity.mark_lost. The customer\'s stage follows. Example: {"opportunity_id":"0190f000-0000-7000-8000-0000000000b1","if_version":2,"stage":"demo"}',
  input: z.object({
    opportunity_id: uuid,
    if_version: ifVersion,
    stage: z.enum(OPPORTUNITY_STAGES).exclude(['lost']),
    /** Gợi ý AI được "Áp dụng" (event `ai_applied` lưu ref) — chỉ là tham chiếu, quyền vẫn của người bấm. */
    suggestion_id: uuid.optional(),
  }),
  output: out,
  permission: 'crm.edit',
  risk: 'write',
  agentGrantable: true,
  undo: { windowSec: 86_400 },
  invalidates: ['crm'],
});

export const contactOpportunityMarkLost = defineAction({
  id: 'contact_opportunity.mark_lost',
  module: 'crm',
  title: 'actions.contact_opportunity.mark_lost.title',
  description:
    'Mark an opportunity lost with a required reason (price · competitor · no_need · unreachable). Every SENT quote of it becomes rejected in the same step (drafts stay). Refused while it has a live order or a signed contract. Example: {"opportunity_id":"0190f000-0000-7000-8000-0000000000b1","if_version":3,"lost_reason":"price"}',
  input: z.object({ opportunity_id: uuid, if_version: ifVersion, lost_reason: z.enum(OPPORTUNITY_LOST_REASONS) }),
  output: out.extend({ rejected_quote_ids: z.array(z.string()) }),
  permission: 'crm.edit',
  risk: 'write',
  agentGrantable: true,
  undo: { windowSec: 86_400 },
  invalidates: ['crm', 'quotes'],
});

export const contactOpportunityReopen = defineAction({
  id: 'contact_opportunity.reopen',
  module: 'crm',
  title: 'actions.contact_opportunity.reopen.title',
  description: 'Reopen a lost opportunity — it returns to "qualified" and the lost reason is cleared. Won opportunities are not reopened here. Example: {"opportunity_id":"0190f000-0000-7000-8000-0000000000b1","if_version":4}',
  input: z.object({ opportunity_id: uuid, if_version: ifVersion }),
  output: out,
  permission: 'crm.edit',
  risk: 'write',
  agentGrantable: true,
  undo: { windowSec: 86_400 },
  invalidates: ['crm'],
});

export const contactOpportunitySetOwner = defineAction({
  id: 'contact_opportunity.set_owner',
  module: 'crm',
  title: 'actions.contact_opportunity.set_owner.title',
  description:
    'Change who owns an opportunity (needs crm.reassign, or the customer\'s owner taking it themselves). Team is re-snapshotted from the new owner; documents keep their own owner (sales credit). Example: {"opportunity_id":"0190f000-0000-7000-8000-0000000000b1","if_version":2,"owner_user_id":"0190f000-0000-7000-8000-0000000000a1"}',
  input: z.object({ opportunity_id: uuid, if_version: ifVersion, owner_user_id: uuid }),
  output: z.object({ opportunity_id: z.string(), version: z.number().int() }),
  permission: 'crm.edit',
  risk: 'write',
  agentGrantable: true,
  undo: { windowSec: 86_400 },
  invalidates: ['crm'],
});

export const contactOpportunityList = defineAction({
  id: 'contact_opportunity.list',
  module: 'crm',
  title: 'actions.contact_opportunity.list.title',
  description:
    'List a customer\'s opportunities (stage, fixed probability, expected value and forecast when you may see money, owner, products), newest first, paged with cursor. Use it to ANSWER pipeline questions about one customer. Example: {"contact_id":"0190f000-0000-7000-8000-000000000001"}',
  input: z.object({ contact_id: uuid, cursor: z.string().max(400).optional(), limit: z.number().int().min(1).max(50).optional() }),
  output: opportunityPageSchema,
  permission: 'crm.view',
  risk: 'read',
  agentGrantable: true,
  skill: true,
  invalidates: [],
});

export const contactOpportunityGet = defineAction({
  id: 'contact_opportunity.get',
  module: 'crm',
  title: 'actions.contact_opportunity.get.title',
  description:
    'Read one opportunity in full: stage, forecast, next step, document chain (quote → contract / order → payment request → payment, only what you may see) and history. Example: {"opportunity_id":"0190f000-0000-7000-8000-0000000000b1"}',
  input: z.object({ opportunity_id: uuid }),
  output: opportunityDetailSchema,
  permission: 'crm.view',
  risk: 'read',
  agentGrantable: true,
  skill: true,
  invalidates: [],
});
