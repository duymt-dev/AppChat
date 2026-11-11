// Nguồn trigger + verifier của `ticket.system_transition` (TIP-003c §1.3, §3.2, §4.4): tin khách / phản hồi → nguồn `event` (tin đã lưu,
// ref = message id) bắt buộc cùng hội thoại với ticket; mốc SLA → nguồn `schedule`, thế hệ = hạn hiện tại (ttr_due_at / frt_due_at) — gia
// hạn / tạm dừng làm đổi hạn → trigger cũ 409. Mỗi ticket một biên nhận (fanout có giới hạn, không một UPDATE rộng ngoài Executor).
import type { TenantDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import { stableTriggerId, type SystemSourceKind, type SystemTrigger } from '../../kernel/actions/system';

export const SUPPORT_SYSTEM_ACTOR = 'support-system';
const ACTION = 'ticket.system_transition';
type Op = 'customer_message' | 'first_response' | 'sla_warning' | 'frt_breach' | 'ttr_breach';
const iso = (d: Date | null | undefined) => d?.toISOString() ?? '';
const kindOf = (op: Op): SystemSourceKind => (op === 'customer_message' || op === 'first_response' ? 'event' : 'schedule');

export function ticketTrigger(ws: string, operation: Op, ticketId: string, sourceRef: string, generation: string): SystemTrigger {
  const kind = kindOf(operation);
  const t = stableTriggerId(kind, sourceRef, ACTION, operation, ticketId, generation, '');
  return { workspaceId: ws, actionId: ACTION, sourceKind: kind, sourceRef, targetId: ticketId, generation, milestone: '', input: { trigger_id: t, entity_id: ticketId, operation }, actor: SUPPORT_SYSTEM_ACTOR, idempotencyKey: `system:${t}` };
}

/** Tin nguồn → ticket mới nhất của hội thoại (D52 — một ticket hiện hành mỗi hội thoại). Thế hệ = message id (bất biến). */
export const messageTrigger = (ws: string, op: 'customer_message' | 'first_response', ticketId: string, messageId: string) => ticketTrigger(ws, op, ticketId, messageId, messageId);
export const slaTrigger = (ws: string, op: 'sla_warning' | 'frt_breach' | 'ttr_breach', t: { id: string; ttrDueAt: Date; frtDueAt: Date }) =>
  ticketTrigger(ws, op, t.id, `ticket.${op}`, op === 'frt_breach' ? iso(t.frtDueAt) : iso(t.ttrDueAt));

export async function verifyTicketTrigger(t: Readonly<SystemTrigger>, db: TenantDb): Promise<void> {
  const i = t.input as { trigger_id?: string; entity_id?: string; operation?: string };
  const op = String(i.operation) as Op;
  if (i.entity_id !== t.targetId || t.sourceKind !== kindOf(op) || i.trigger_id !== stableTriggerId(t.sourceKind, t.sourceRef, ACTION, op, t.targetId, t.generation, t.milestone ?? '')) throw new AppError('CONFLICT', 409, { trigger: 'stale' });
  const tk = await db.ticket.findUnique({ where: { id: t.targetId }, select: { conversationId: true, ttrDueAt: true, frtDueAt: true } });
  if (!tk) throw new AppError('NOT_FOUND', 404, { trigger: 'source_not_found' });
  if (t.sourceKind === 'event') {
    const m = await db.message.findUnique({ where: { id: t.sourceRef }, select: { conversationId: true } });
    if (!m || t.generation !== t.sourceRef || m.conversationId !== tk.conversationId) throw new AppError('NOT_FOUND', 404, { trigger: 'source_not_found' });
    return;
  }
  if (t.sourceRef !== `ticket.${op}` || (op === 'frt_breach' ? iso(tk.frtDueAt) : iso(tk.ttrDueAt)) !== t.generation) throw new AppError('CONFLICT', 409, { trigger: 'stale' });
}
