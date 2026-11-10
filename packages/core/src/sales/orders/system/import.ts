// `order.system_import` (TIP-003c §2, §4.8; DC271 thay DV011): một bản đơn sàn ĐÃ KIỂM (checkExternalOrder) áp qua importExternal sẵn có
// — không importer thứ hai. Nguồn `ingress` = (kết nối, mã ngoài), thế hệ = hash chuẩn của bản; bản đã kiểm giữ trong tiến trình đúng
// lúc gọi (không qua input / log / Redis). Verifier: kết nối còn tồn tại, chưa ngắt. Cùng bản giao lại (webhook + poll, chạy lại job) →
// một biên nhận, không nhập lần hai; bản mới (hash khác) → biên nhận mới, importExternal tự quyết theo trạng thái đơn hiện tại.
import { Inject, Injectable } from '@nestjs/common';
import type { TenantDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { ExternalOrder, MappedStatus } from '@appchat/integrations';
import type { ActionInput, SystemOutput, orderSystemImport } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../../kernel/actions/handler';
import { stableTriggerId, systemCapabilityOf, type SystemTrigger } from '../../../kernel/actions/system';
import { CLOCK, type Clock } from '../../../kernel/clock';
import { importExternal, type CheckedMeta } from '../services/order-import';

const ACTION = 'order.system_import';
export const ORDER_IMPORT_ACTOR = 'order-sync';

/** Bản đơn đã kiểm + trạng thái đã ánh xạ bởi adapter của kết nối — chỉ sống trong lời gọi. */
export interface StagedOrder {
  conn: { id: string; createdBy: string | null };
  order: ExternalOrder;
  mapped: MappedStatus;
  meta: CheckedMeta;
}

const held = new Map<string, StagedOrder>();
const refOf = (connId: string, externalId: string) => `order-sync:${connId}:${externalId}`;

/** `milestone` = lần thử lại biên nhận chặn theo phiên bản khách tham chiếu (khôi phục tăng version → biên nhận mới); giao lần đầu rỗng. */
export function orderImportTrigger(ws: string, s: StagedOrder, milestone = ''): SystemTrigger {
  const ref = refOf(s.conn.id, s.order.external_id);
  const t = stableTriggerId('ingress', ref, ACTION, 'apply_verified_revision', s.conn.id, s.meta.hash, milestone);
  return { workspaceId: ws, actionId: ACTION, sourceKind: 'ingress', sourceRef: ref, targetId: s.conn.id, generation: s.meta.hash, milestone, input: { trigger_id: t, entity_id: s.conn.id, operation: 'apply_verified_revision' }, actor: ORDER_IMPORT_ACTOR, idempotencyKey: `system:${t}` };
}

export async function withStagedOrder<T>(t: SystemTrigger, s: StagedOrder, fn: () => Promise<T>): Promise<T> {
  const k = `${t.workspaceId}:${t.sourceRef}:${t.generation}`;
  held.set(k, s);
  try {
    return await fn();
  } finally {
    held.delete(k);
  }
}

function takeStaged(ws: string, ref: string, gen: string): StagedOrder | null {
  const k = `${ws}:${ref}:${gen}`;
  const s = held.get(k) ?? null;
  held.delete(k);
  return s;
}

export async function verifyOrderImport(t: Readonly<SystemTrigger>, db: TenantDb): Promise<void> {
  const i = t.input as { trigger_id?: string; entity_id?: string };
  if (t.sourceKind !== 'ingress' || !t.sourceRef.startsWith(`order-sync:${t.targetId}:`) || i.entity_id !== t.targetId || i.trigger_id !== stableTriggerId(t.sourceKind, t.sourceRef, ACTION, 'apply_verified_revision', t.targetId, t.generation, t.milestone ?? ''))
    throw new AppError('CONFLICT', 409, { trigger: 'stale' });
  const c = await db.integrationConnection.findUnique({ where: { id: t.targetId }, select: { port: true, status: true } });
  if (!c || c.port !== 'order_sync') throw new AppError('NOT_FOUND', 404, { trigger: 'source_not_found' });
  if (c.status === 'disconnected') throw new AppError('CONFLICT', 409, { trigger: 'connection_disconnected' });
}

@Injectable()
@ActionHandler(ACTION)
export class OrderSystemImportHandler implements Handler<ActionInput<typeof orderSystemImport>, SystemOutput> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async preview(): Promise<never> {
    throw new AppError('FORBIDDEN', 403, { capability: 'internal' });
  }

  async execute(ctx: ActionContext, i: ActionInput<typeof orderSystemImport>, tx: TenantTx): Promise<HandlerOutcome<SystemOutput>> {
    const cap = systemCapabilityOf(ctx);
    if (!cap || cap.targetId !== i.entity_id) throw new AppError('FORBIDDEN', 403, { capability: 'missing' });
    const s = takeStaged(ctx.workspaceId, cap.sourceRef, cap.generation);
    // Không có bản đã kiểm trong tiến trình (vd. gọi lại sau crash) → không đoán payload; nguồn bền (sự kiện / poll) giao lại.
    if (!s || s.conn.id !== i.entity_id || s.meta.hash !== cap.generation) return { result: { disposition: 'no_effect', operation_id: i.entity_id, reason_code: 'revision_missing' }, noUndo: true };
    const out = await importExternal(tx, s.conn, s.order, s.mapped, this.clock.now(), s.meta);
    const ref = out.orderId ?? undefined;
    const reason = out.created ? 'created' : out.blocked ? `blocked_${out.blocked}` : 'updated';
    return { result: { disposition: 'applied', operation_id: i.entity_id, ...(ref ? { effect_ref: ref } : {}), reason_code: reason }, events: out.events, noUndo: true };
  }
}
