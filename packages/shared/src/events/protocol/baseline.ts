// Schema của các topic ĐANG được phát nhưng chưa khai trong EVENT_SCHEMAS (TIP-003b §1.3, rà nguồn 2026-11-11 — DV-099). Giữ đúng
// hình payload hiện tại (không đổi tên trường); `ws` + `occurred_at` do writeOutbox thêm. Không có consumer domain nào được "bịa" thêm
// ở đây — disposition consumer nằm trong manifest worker, không phải schema.
import { z } from 'zod';

const base = { ws: z.string().uuid(), occurred_at: z.string() };
const uuid = z.string().uuid();

/** Cấp DB tenant xong / khôi phục xong (tenant-provision.processor, restore-run). */
export const workspaceReadyEvent = z.object({ ...base, workspace_id: uuid, restored: z.boolean().optional() });
/** Tạo nhãn hội thoại (inbox settings) — trường `id` là id nhãn (trường cũ, khai tường minh, không suy luận). */
export const tagCreatedEvent = z.object({ ...base, id: uuid });
/** Mốc hoạt động workspace do Executor ghi cùng action_log (TIP-041). */
export const workspaceActivityEvent = z.object({ ...base, action_log_id: uuid, source: z.string().max(40), actor_type: z.string().max(40) });
/** Hoạt động khách: việc cần làm / cơ hội (TIP-015e) — chỉ id + khách + version. */
const activity = z.object({ ...base, contact_id: uuid, activity_id: uuid, version: z.number().int() });
/** Lượt Trợ lý đã nhận (TIP-023c) — consumer AI chạy run. */
export const assistantTurnRequestedEvent = z.object({ ...base, run_id: uuid, user_id: uuid });
/** Kế hoạch Cowork (TIP-023d §1.5) — chỉ id / revision. */
export const assistantPlanProposedEvent = z.object({ ...base, plan_id: uuid, owner_user_id: uuid, session_id: uuid, revision: z.number().int() });
export const assistantPlanProgressedEvent = z.object({ ...base, plan_id: uuid, revision: z.number().int(), phase: z.string().max(40) });
export const assistantPlanEditRequestedEvent = z.object({ ...base, plan_id: uuid, plan_epoch: z.number().int() });
/** Kế hoạch đã tiếp tục (TIP-023d §3.6) — ROLE=ai chạy tiếp lượt gốc từ checkpoint; chỉ id + epoch. */
export const assistantPlanResumedEvent = z.object({ ...base, plan_id: uuid, root_run_id: uuid, plan_epoch: z.number().int() });
/** "Quên khách" (TIP-015c §1.7) — chỉ id + thế hệ + pha. */
export const privacyRequestedEvent = z.object({ ...base, operation_id: uuid, canonical_contact_id: uuid, family_generation: z.number().int(), requester_id: uuid });
export const privacyProgressedEvent = z.object({ ...base, operation_id: uuid, phase: z.string().max(40) });
export const privacyForgottenEvent = z.object({ ...base, operation_id: uuid, canonical_contact_id: uuid, family_generation: z.number().int() });
/** Biên nhận ngân hàng đã nhận (TIP-032b) — consumer đối soát. */
export const bankReceiptAcceptedEvent = z.object({ ...base, receipt_id: uuid });

export const BASELINE_EVENT_SCHEMAS = {
  'workspace.ready': workspaceReadyEvent,
  'tag.created': tagCreatedEvent,
  'workspace.activity': workspaceActivityEvent,
  'contact_task.created': activity,
  'contact_task.updated': activity,
  'contact_task.state_changed': activity,
  'contact_opportunity.created': activity,
  'contact_opportunity.updated': activity,
  'contact_opportunity.archived': activity,
  'contact_opportunity.stage_changed': activity,
  'contact_opportunity.lost': activity,
  'contact_opportunity.reopened': activity,
  'contact_opportunity.owner_changed': activity,
  'assistant.turn_requested': assistantTurnRequestedEvent,
  'assistant.plan_proposed': assistantPlanProposedEvent,
  'assistant.plan_progressed': assistantPlanProgressedEvent,
  'assistant.plan_edit_requested': assistantPlanEditRequestedEvent,
  'assistant.plan_resumed': assistantPlanResumedEvent,
  'contact.privacy_requested': privacyRequestedEvent,
  'contact.privacy_progressed': privacyProgressedEvent,
  'contact.forgotten': privacyForgottenEvent,
  'bank_receipt.accepted': bankReceiptAcceptedEvent,
} as const;
