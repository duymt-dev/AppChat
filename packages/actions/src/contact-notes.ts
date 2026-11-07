// Ghi chú / bình luận trên khách (TIP-026b DC253): ghi chú nội bộ (Blueprint §3.4 — agent được cấp tường minh) và bình luận đồng nghiệp
// (không agent). KHÔNG gửi ra Zalo / email / Hộp thư. Nguồn hội thoại / tin tuỳ chọn — server kiểm thuộc đúng khách + người gọi thấy được.
// Đọc hoạt động phân trang: contact_activity.list (cùng reader với GET /v1/contacts/:id/activities).
import { z } from 'zod';
import { ACTIVITY_KINDS } from '@appchat/shared';
import { defineAction } from './define';
import { activitySource } from './crm-schemas';

const uuid = z.string().uuid();
const body = z.string().trim().min(1).max(5000);

const noteOut = z.object({ note_id: z.string(), kind: z.enum(['note', 'comment']), version: z.number().int() });

export const contactAddNote = defineAction({
  id: 'contact.add_note',
  module: 'crm',
  title: 'actions.contact.add_note.title',
  description:
    'Add an internal CRM note to a customer (never sent to the customer). Optional source_conversation_id / source_message_id from the current conversation. Example: {"contact_id":"0190f000-0000-7000-8000-000000000001","body":"Khách muốn gói chăm sóc da cuối tuần"}',
  input: z.object({ contact_id: uuid, body }).merge(activitySource),
  output: noteOut,
  permission: 'crm.edit',
  risk: 'write',
  agentGrantable: true,
  undo: { windowSec: 86_400 },
  invalidates: ['crm'],
});

export const contactAddComment = defineAction({
  id: 'contact.add_comment',
  module: 'crm',
  title: 'actions.contact.add_comment.title',
  description: 'Add an internal comment for coworkers on a customer profile (not a message to the customer). Example: {"contact_id":"0190f000-0000-7000-8000-000000000001","body":"Anh xem giúp báo giá này"}',
  input: z.object({ contact_id: uuid, body }).merge(activitySource),
  output: noteOut,
  permission: 'crm.edit',
  risk: 'write',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['crm'],
});

export const contactActivityList = defineAction({
  id: 'contact_activity.list',
  module: 'crm',
  title: 'actions.contact_activity.list.title',
  description:
    'List a customer\'s CRM activities of one kind: notes, comments, manual follow-up tasks (not AI tasks) or opportunities (expected value, not revenue). Paged with cursor. Example: {"contact_id":"0190f000-0000-7000-8000-000000000001","kind":"tasks"}',
  input: z.object({ contact_id: uuid, kind: z.enum(ACTIVITY_KINDS), activity_id: uuid.optional(), cursor: z.string().max(400).optional(), limit: z.number().int().min(1).max(100).optional() }),
  output: z.object({ kind: z.string(), items: z.array(z.record(z.string(), z.unknown())), next_cursor: z.string().nullable() }),
  permission: 'crm.view',
  risk: 'read',
  agentGrantable: true,
  invalidates: [],
});
