// Sửa ticket hàng loạt có kết quả từng id + hoàn tác có canh gác (TIP-034c). Cha công khai `ticket.bulk_update` / `ticket.bulk_undo`
// (bulk → luôn xem trước kèm số bản ghi; không cấp agent); con RIÊNG `ticket.bulk_item` / `ticket.bulk_item_undo` (003c exposure=internal —
// HTTP / Trợ lý / Builder không liệt kê, không gọi được; chỉ ctx niêm phong capability của thao tác cha đã nhận). Con chạy một transaction
// mỗi ticket qua Executor dưới quyền HIỆN TẠI của người tạo; biên nhận = data_job_item của 045b. ≤ 50 chạy ngay sau commit, 51–200 → 202.
import { z } from 'zod';
import { TICKET_BULK_MAX, ticketBulkResultSchema, ticketBulkUndoResultSchema } from '@appchat/shared';
import { defineAction } from './define';

const ticketId = z.string().min(1);
const priority = z.enum(['high', 'medium', 'low']);
/** Con: đúng việc + biên nhận + ticket + fence của lease người chạy (worker mất lease không ghi được). */
const itemInput = z.object({ job_id: z.string().uuid(), seq: z.number().int().min(0), ticket_id: z.string().uuid(), fence: z.number().int().min(1) }).strict();
const itemOutput = z.object({ ticket_id: z.string(), changed: z.boolean(), version: z.number().int() });

export const ticketBulkUpdate = defineAction({
  id: 'ticket.bulk_update',
  module: 'support',
  title: 'actions.ticket.bulk_update.title',
  description:
    'Change many tickets at once: assign to a member OR an AI agent (assignment only — the agent does not run), and/or set priority. Each ticket is applied independently; missing / hidden / closed / changed tickets are reported per id. ' +
    'Example: {"ticket_ids":["0190f3a2-7b1c-7d10-9a5e-4c2b1f0e9a11","0190f3a2-7b1c-7d10-9a5e-4c2b1f0e9a12"],"assignee_user_id":"0190f3a2-7b1c-7d10-9a5e-4c2b1f0e9a20","priority":"high"}',
  input: z.object({
    ticket_ids: z.array(ticketId).min(1).max(TICKET_BULK_MAX),
    assignee_user_id: z.string().optional(),
    assignee_agent_id: z.string().optional(),
    priority: priority.optional(),
    /** Version đang thấy của từng ticket đã chọn (tuỳ chọn) — lệch → kết quả `STALE_VERSION` riêng ticket đó. */
    if_versions: z.record(z.string(), z.number().int().min(1)).optional(),
  }),
  output: ticketBulkResultSchema,
  permission: 'ticket.manage',
  risk: 'write',
  bulk: true,
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['tickets'],
});


export const ticketBulkItem = defineAction({
  id: 'ticket.bulk_item',
  module: 'support',
  title: 'actions.ticket.bulk_item.title',
  description: 'Internal: apply one accepted ticket bulk change to one ticket (assignment and priority together, one transaction).',
  input: itemInput,
  output: itemOutput,
  permission: 'ticket.manage',
  risk: 'write',
  agentGrantable: false,
  exposure: 'internal',
  invalidates: ['tickets'],
});

export const ticketBulkUndo = defineAction({
  id: 'ticket.bulk_undo',
  module: 'support',
  title: 'actions.ticket.bulk_undo.title',
  description:
    'Undo a finished ticket bulk change: restores only the fields it changed, only on tickets nobody has edited since; tickets changed later are reported as conflicts and left as they are. ' +
    'Example: {"parent_action_log_id":"0190f3a2-7b1c-7d10-9a5e-4c2b1f0e9a30"}',
  input: z.object({ parent_action_log_id: z.string().min(1) }),
  output: ticketBulkUndoResultSchema,
  permission: 'ticket.manage',
  risk: 'write',
  bulk: true,
  agentGrantable: false,
  invalidates: ['tickets'],
});

export const ticketBulkItemUndo = defineAction({
  id: 'ticket.bulk_item_undo',
  module: 'support',
  title: 'actions.ticket.bulk_item_undo.title',
  description: 'Internal: revert one ticket of a sealed bulk undo — only the changed fields, only if the ticket is still exactly as the bulk change left it.',
  input: itemInput,
  output: itemOutput,
  permission: 'ticket.manage',
  risk: 'write',
  agentGrantable: false,
  exposure: 'internal',
  invalidates: ['tickets'],
});
