// DTO hoạt động CRM (TIP-026b): GET /v1/contacts/:id/activities + action contact_activity.list + tóm tắt trong Hồ sơ 360°.
// Tiền cơ hội theo chính sách trường tiền 045b: `amount_vnd` null = chưa biết; VẮNG (kèm `amount_hidden`) = người xem không được thấy.
// TIP-026c: cơ hội dùng DTO pipeline (`./opportunities` — bỏ `probability` / `quote_id`); thẻ hiện hành = `opportunityCardSchema`.
import { z } from 'zod';
import { CONTACT_NOTE_KINDS, CONTACT_TASK_STATES } from '../crm/activity-state';
import { opportunityCardSchema, opportunityItemSchema } from './opportunities';

const author = z.object({ type: z.enum(['user', 'agent', 'system']), name: z.string() });

export const noteItemSchema = z.object({
  id: z.string(),
  kind: z.enum(CONTACT_NOTE_KINDS),
  body: z.string(),
  author,
  created_at: z.string(),
  version: z.number().int(),
});

export const taskItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  due_at: z.string().nullable(),
  assignee: z.object({ id: z.string(), name: z.string(), available: z.boolean() }).nullable(),
  state: z.enum(CONTACT_TASK_STATES),
  completed_at: z.string().nullable(),
  version: z.number().int(),
});

export const activityPageSchema = z.object({
  kind: z.enum(['notes', 'comments', 'tasks', 'opportunities']),
  items: z.array(z.union([noteItemSchema, taskItemSchema, opportunityItemSchema])),
  next_cursor: z.string().nullable(),
});

/** Tóm tắt hoạt động trong Hồ sơ 360° (trang đầu mỗi loại + đếm theo quyền). */
export const activitySummarySchema = z.object({
  notes: z.object({ latest: noteItemSchema.nullable(), count: z.number().int() }),
  comments: z.object({ items: z.array(noteItemSchema), count: z.number().int(), next_cursor: z.string().nullable() }),
  tasks: z.object({ items: z.array(taskItemSchema), open: z.number().int(), next_cursor: z.string().nullable() }),
  opportunity: z.object({ current: opportunityCardSchema.nullable(), count: z.number().int() }),
  can_edit: z.boolean(),
});

export type NoteItemDto = z.infer<typeof noteItemSchema>;
export type TaskItemDto = z.infer<typeof taskItemSchema>;
export type ActivityPageDto = z.infer<typeof activityPageSchema>;
export type ActivitySummaryDto = z.infer<typeof activitySummarySchema>;
