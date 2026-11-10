// Nguồn trigger của action riêng sales (TIP-003c §1.3, §3.2): trigger tất định từ nguồn BỀN (báo giá đã gửi / hạn hiện tại / sự kiện đơn
// đã xác nhận) + verifier đọc lại thực thể đã lưu — thế hệ lệch (gia hạn / đổi hạn / gửi lại) → 409, không niêm phong. Thế hệ là mốc domain
// (sent_at / valid_until / due_date / expires_at), không phải updated_at hay giờ quét.
import type { TenantDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import { stableTriggerId, type SystemSourceKind, type SystemTrigger } from '../../kernel/actions/system';

export const SALES_SYSTEM_ACTOR = 'sales-system';
const iso = (d: Date | null | undefined) => d?.toISOString() ?? '';

type Op = { actionId: 'quote.system_transition' | 'invoice.system_transition' | 'package.system_transition'; operation: string };

export function salesTrigger(ws: string, op: Op, kind: SystemSourceKind, sourceRef: string, target: string, generation: string, milestone = ''): SystemTrigger {
  const trigger = stableTriggerId(kind, sourceRef, op.actionId, op.operation, target, generation, milestone);
  return {
    workspaceId: ws,
    actionId: op.actionId,
    sourceKind: kind,
    sourceRef,
    targetId: target,
    generation,
    milestone,
    input: { trigger_id: trigger, entity_id: target, operation: op.operation },
    actor: SALES_SYSTEM_ACTOR,
    idempotencyKey: `system:${trigger}`,
  };
}

export const quoteViewTrigger = (ws: string, q: { id: string; sentAt: Date | null }) => salesTrigger(ws, { actionId: 'quote.system_transition', operation: 'record_view' }, 'public_locator', q.id, q.id, iso(q.sentAt));
export const quoteExpireTrigger = (ws: string, q: { id: string; validUntil: Date | null }) => salesTrigger(ws, { actionId: 'quote.system_transition', operation: 'expire' }, 'schedule', 'quote.expire', q.id, iso(q.validUntil));
export const quoteRemindTrigger = (ws: string, q: { id: string; validUntil: Date | null }) => salesTrigger(ws, { actionId: 'quote.system_transition', operation: 'remind' }, 'schedule', 'quote.remind', q.id, iso(q.validUntil), 'T-2');
export const invoiceOverdueTrigger = (ws: string, i: { id: string; dueDate: Date }) => salesTrigger(ws, { actionId: 'invoice.system_transition', operation: 'overdue' }, 'schedule', 'invoice.overdue', i.id, iso(i.dueDate));
export const invoiceRemindTrigger = (ws: string, i: { id: string; dueDate: Date }, step: string) => salesTrigger(ws, { actionId: 'invoice.system_transition', operation: 'remind' }, 'schedule', 'invoice.remind', i.id, iso(i.dueDate), step);
export const packageExpireTrigger = (ws: string, p: { id: string; expiresAt: Date | null }) => salesTrigger(ws, { actionId: 'package.system_transition', operation: 'expire' }, 'schedule', 'package.expire', p.id, iso(p.expiresAt));
export const packageGrantTrigger = (ws: string, eventId: string, orderId: string) => salesTrigger(ws, { actionId: 'package.system_transition', operation: 'grant_on_confirm' }, 'event', eventId, orderId, eventId);
export const packageRemainingTrigger = (ws: string, eventId: string, packageId: string) => salesTrigger(ws, { actionId: 'package.system_transition', operation: 'remind_remaining' }, 'event', eventId, packageId, eventId);

const stale = () => new AppError('CONFLICT', 409, { trigger: 'stale' });
const missing = () => new AppError('NOT_FOUND', 404, { trigger: 'source_not_found' });

/** Một verifier cho cả họ: trigger_id phải đúng hàm của nguồn (không đúc input khác), thực thể có thật + thế hệ khớp. */
export async function verifySalesTrigger(t: Readonly<SystemTrigger>, db: TenantDb): Promise<void> {
  const i = t.input as { trigger_id?: string; entity_id?: string; operation?: string };
  if (i.entity_id !== t.targetId || i.trigger_id !== stableTriggerId(t.sourceKind, t.sourceRef, t.actionId, String(i.operation), t.targetId, t.generation, t.milestone ?? '')) throw stale();
  const gen = await generationOf(db, t.actionId, String(i.operation), t.targetId, t.sourceRef);
  if (gen === null) throw missing();
  if (gen !== t.generation) throw stale();
}

async function generationOf(db: TenantDb, actionId: string, op: string, id: string, sourceRef: string): Promise<string | null> {
  if (actionId === 'quote.system_transition') {
    const q = await db.quote.findUnique({ where: { id }, select: { sentAt: true, validUntil: true, deletedAt: true } });
    if (!q || q.deletedAt) return null;
    return op === 'record_view' ? iso(q.sentAt) : iso(q.validUntil);
  }
  if (actionId === 'invoice.system_transition') {
    const v = await db.invoice.findUnique({ where: { id }, select: { dueDate: true } });
    return v ? iso(v.dueDate) : null;
  }
  if (op === 'grant_on_confirm') {
    // Nguồn là event `order.confirmed` đã lưu trong outbox (không tin payload job): đúng topic + đúng đơn.
    const [e, o] = await Promise.all([db.outboxEvent.findUnique({ where: { id: sourceRef }, select: { topic: true, payload: true } }), db.order.findUnique({ where: { id }, select: { id: true } })]);
    if (!e || !o || e.topic !== 'order.confirmed' || (e.payload as { order_id?: string }).order_id !== id) return null;
    return sourceRef;
  }
  if (op === 'remind_remaining') {
    // Nguồn là event `appointment.completed` đã lưu đúng gói (buổi đã trừ); số buổi còn lại kiểm lại dưới khoá trong handler.
    const [e, p] = await Promise.all([db.outboxEvent.findUnique({ where: { id: sourceRef }, select: { topic: true, payload: true } }), db.customerPackage.findUnique({ where: { id }, select: { id: true } })]);
    if (!e || !p || e.topic !== 'appointment.completed' || (e.payload as { package_id?: string }).package_id !== id) return null;
    return sourceRef;
  }
  const p = await db.customerPackage.findUnique({ where: { id }, select: { expiresAt: true } });
  return p ? iso(p.expiresAt) : null;
}
