// Hỗ trợ / Ticket (Blueprint §3.4 support; §2.2 ticket). Prototype L4837–4955 + drawer L3276–3360.
// open → in_progress → waiting (SLA tạm dừng) → closed (lý do bắt buộc); reopen đưa về open và tăng reopened_count.
import { z } from 'zod';
import { customValuesSchema } from '@appchat/shared';
import { defineAction } from './define';

const ticketId = z.string().min(1);
const status = z.enum(['open', 'in_progress', 'waiting']);
const priority = z.enum(['high', 'medium', 'low']);
const out = z.object({ ticket_id: z.string(), status: z.string() });
/** Khoá lạc quan (concurrency §1, TIP-003e): version ticket form đã mở; lệch → 409 STALE_VERSION. Không gửi = ghi bản mới nhất. */
const ifVersion = z.number().int().positive().optional();
const opened = (o: { ticket_id: string }) => ({
  type: 'open' as const,
  entity: 'ticket',
  id: o.ticket_id,
  view: 'drawer' as const,
});

export const ticketSearch = defineAction({
  id: 'ticket.search',
  module: 'support',
  title: 'actions.ticket.search.title',
  description: 'Search tickets by text / status / priority / SLA state. Example: {"q":"hoàn tiền","sla":"breach"}',
  input: z.object({
    q: z.string().optional(),
    status: z.enum(['open', 'in_progress', 'waiting', 'closed']).optional(),
    priority: priority.optional(),
    sla: z.enum(['breach', 'risk', 'ok']).optional(),
  }),
  output: z.object({ tickets: z.array(z.object({ id: z.string(), code: z.string(), title: z.string(), status: z.string() })) }),
  permission: 'ticket.view',
  risk: 'read',
  agentGrantable: true,
  skill: true,
  invalidates: [],
});

export const ticketCreate = defineAction({
  id: 'ticket.create',
  module: 'support',
  title: 'actions.ticket.create.title',
  description:
    'Open a support ticket; SLA due times come from the default SLA policy and priority. Example: {"title":"Khách yêu cầu hoàn tiền","company":"Cty ABC","channel":"zalo_personal","category":"Refund","priority":"high"}',
  input: z.object({
    title: z.string().trim().min(1).max(200),
    company: z.string().max(120).optional(),
    email: z.string().email().optional(),
    contact_id: z.string().optional(),
    channel: z.enum(['zalo_personal', 'webchat', 'email']),
    category: z.string().min(1),
    priority,
    status: status.optional(),
    team_id: z.string().optional(),
    assignee_user_id: z.string().optional(),
    assignee_agent_id: z.string().optional(),
    description: z.string().max(5000).optional(),
    /** Tạo từ Hộp thư (REQ-C09, TIP-025b §D.1): hội thoại + tin nguồn phải thấy được và khớp khách — sai → 404 / 422, không bỏ qua. */
    conversation_id: z.string().optional(),
    source_message_id: z.string().optional(),
    /**
     * Khách đã có ticket còn mở cùng danh mục trong 24 giờ (REQ-H02): `ask` (mặc định) → 409 CONFLICT `{ duplicate_of: mã }` để hỏi gộp;
     * `merge` → thêm nội dung vào ticket cũ; `create` → vẫn tạo mới.
     */
    on_duplicate: z.enum(['ask', 'merge', 'create']).optional(),
    /** Trường tuỳ biến (D56) — validate theo định nghĩa ở Executor. */
    custom: customValuesSchema.optional(),
  }),
  /** `merged` = đã gộp vào ticket cũ cùng khách + danh mục (on_duplicate=merge). */
  output: z.object({ ticket_id: z.string(), code: z.string(), merged: z.boolean().optional() }),
  permission: 'ticket.manage',
  risk: 'write',
  agentGrantable: true,
  undo: { windowSec: 86_400 },
  invalidates: ['tickets'],
  uiTarget: opened,
});

export const ticketUpdate = defineAction({
  id: 'ticket.update',
  module: 'support',
  title: 'actions.ticket.update.title',
  description: 'Edit ticket details: title, description, category, priority, custom fields. Example: {"ticket_id":"…","priority":"high"}',
  input: z.object({
    ticket_id: ticketId,
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().max(5000).optional(),
    category: z.string().trim().min(1).max(60).optional(),
    priority: priority.optional(),
    custom: customValuesSchema.optional(),
    if_version: ifVersion,
  }),
  output: out,
  permission: 'ticket.manage',
  risk: 'write',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['tickets'],
});

export const ticketAssign = defineAction({
  id: 'ticket.assign',
  module: 'support',
  title: 'actions.ticket.assign.title',
  description: 'Assign a ticket to a user or the AI agent (exactly one). Example: {"ticket_id":"tk_2041","assignee_user_id":"u_minh"}',
  input: z.object({
    ticket_id: ticketId,
    assignee_user_id: z.string().optional(),
    assignee_agent_id: z.string().optional(),
    team_id: z.string().optional(),
    if_version: ifVersion,
  }),
  output: out,
  permission: 'ticket.manage',
  risk: 'write',
  agentGrantable: true,
  undo: { windowSec: 86_400 },
  invalidates: ['tickets'],
});

export const ticketSetStatus = defineAction({
  id: 'ticket.set_status',
  module: 'support',
  title: 'actions.ticket.set_status.title',
  description: 'Move an open ticket between open / in_progress / waiting (waiting pauses the SLA clock). Use ticket.close to close.',
  input: z.object({ ticket_id: ticketId, status, if_version: ifVersion }),
  output: out,
  permission: 'ticket.manage',
  risk: 'write',
  agentGrantable: true,
  undo: { windowSec: 86_400 },
  invalidates: ['tickets'],
});

export const ticketComment = defineAction({
  id: 'ticket.comment',
  module: 'support',
  title: 'actions.ticket.comment.title',
  description:
    'Add an internal note (internal=true) or a reply to the customer (internal=false; first reply stops the FRT clock). Example: {"ticket_id":"tk_2041","body":"Đã gọi khách","internal":true}',
  input: z.object({ ticket_id: ticketId, body: z.string().trim().min(1).max(5000), internal: z.boolean() }),
  output: z.object({ ticket_id: z.string(), comment_id: z.string() }),
  permission: 'ticket.manage',
  risk: 'write',
  agentGrantable: true,
  undo: { windowSec: 86_400 },
  invalidates: ['tickets'],
});

export const ticketClose = defineAction({
  id: 'ticket.close',
  module: 'support',
  title: 'actions.ticket.close.title',
  description: 'Close a ticket; reason required (resolved | duplicate | withdrawn | out_of_scope). SLA result is recorded.',
  input: z.object({
    ticket_id: ticketId,
    reason: z.enum(['resolved', 'duplicate', 'withdrawn', 'out_of_scope']),
    note: z.string().max(1000).optional(),
    if_version: ifVersion,
  }),
  output: out.extend({ sla_result: z.enum(['met', 'breached']) }),
  permission: 'ticket.manage',
  risk: 'write',
  agentGrantable: true,
  undo: { windowSec: 86_400 },
  invalidates: ['tickets'],
});

export const ticketReopen = defineAction({
  id: 'ticket.reopen',
  module: 'support',
  title: 'actions.ticket.reopen.title',
  description: 'Reopen a closed ticket (→ open, reopened_count + 1).',
  input: z.object({ ticket_id: ticketId, if_version: ifVersion }),
  output: out,
  permission: 'ticket.manage',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['tickets'],
});
