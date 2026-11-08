// Việc chăm sóc thủ công trên khách (TIP-026b DC253) — KHÔNG phải tác vụ AI: không chạy nền, không đặt lịch hẹn, không tính credit.
// Hạn là thời điểm ISO có offset (giờ workspace do FE gửi kèm offset); người được giao phải là thành viên còn quyền sửa khách — giao việc
// không cấp quyền. Chuyển trạng thái: open ↔ done; open / done → cancelled; cancelled → open chỉ khi mở lại tường minh.
import { z } from 'zod';
import { CONTACT_TASK_STATES } from '@appchat/shared';
import { defineAction } from './define';
import { activitySource } from './crm-schemas';

const uuid = z.string().min(1).max(64); // id như các action CRM khác — server kiểm UUID (sai → 404 / 422)
const ifVersion = z.number().int().positive().optional();
const due = z.string().datetime({ offset: true }).nullable();
const patch = z.object({ title: z.string().trim().min(1).max(200), description: z.string().max(5000), due_at: due, assignee_user_id: uuid.nullable() });
const out = z.object({ task_id: z.string(), version: z.number().int() });

export const contactTaskCreate = defineAction({
  id: 'contact_task.create',
  module: 'crm',
  title: 'actions.contact_task.create.title',
  description:
    'Create a manual follow-up task on a customer (a reminder for staff — not an AI task, not an appointment). due_at ISO with offset. Example: {"contact_id":"0190f000-0000-7000-8000-000000000001","title":"Gọi lại tư vấn gói","due_at":"2026-11-10T09:00:00+07:00"}',
  input: z.object({ contact_id: uuid, title: patch.shape.title, description: patch.shape.description.optional(), due_at: due.optional(), assignee_user_id: uuid.nullable().optional() }).merge(activitySource),
  output: out,
  permission: 'crm.edit',
  risk: 'write',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['crm'],
});

export const contactTaskUpdate = defineAction({
  id: 'contact_task.update',
  module: 'crm',
  title: 'actions.contact_task.update.title',
  description: 'Edit a follow-up task (title / description / due / assignee). Send if_version from the latest read. Example: {"task_id":"0190f000-0000-7000-8000-0000000000a1","if_version":1,"patch":{"title":"Gọi lại chiều nay"}}',
  input: z.object({ task_id: uuid, if_version: ifVersion, patch: patch.partial().refine((p) => Object.keys(p).length > 0, { message: 'empty' }) }),
  output: out,
  permission: 'crm.edit',
  risk: 'write',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['crm'],
});

export const contactTaskSetState = defineAction({
  id: 'contact_task.set_state',
  module: 'crm',
  title: 'actions.contact_task.set_state.title',
  description: 'Mark a follow-up task done, reopen it, or cancel it. Example: {"task_id":"0190f000-0000-7000-8000-0000000000a1","if_version":1,"state":"done"}',
  input: z.object({ task_id: uuid, if_version: ifVersion, state: z.enum(CONTACT_TASK_STATES) }),
  output: z.object({ task_id: z.string(), state: z.enum(CONTACT_TASK_STATES), version: z.number().int() }),
  permission: 'crm.edit',
  risk: 'write',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['crm'],
});
