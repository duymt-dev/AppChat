// POST /v1/action-logs/:id/undo (Blueprint §4.3): trong hạn → handler.undo + status=undone; quá hạn / không hỗ trợ → 409. Cha có action
// hoàn tác riêng (undo-action-registry, TIP-034c) → 409 UNDO_REQUIRES_ACTION trước mọi ghi.
import { AppError } from '@appchat/shared';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import { undoPlatformAction } from '../consistency/undo-operation';
import type { Clock } from '../clock';
import { markDirty } from '../outbox/outbox';
import { withEventTransaction } from '../outbox/transaction';
import type { KeyValueStore } from '../redis';
import type { ActionContext } from './action-context';
import type { ActionHandlerRegistry } from './handler-registry';
import { undoActionOf } from './undo-action-registry';

export class UndoService {
  constructor(
    private readonly handlers: ActionHandlerRegistry,
    private readonly resolver: TenantDbResolver,
    private readonly clock: Clock,
    /** Undo ghi outbox (vd. `product.changed` khi khôi phục — TIP-027) → đánh dấu workspace cho relay sau commit. */
    private readonly kv?: KeyValueStore,
    /** Hoàn tác action nền tảng (TIP-045b). */
    private readonly platform?: PlatformDb,
  ) {}

  async undo(ctx: ActionContext, actionLogId: string): Promise<{ undone: true }> {
    const db = await this.resolver.get(TenantContexts.system(ctx.workspaceId, 'action:undo'));
    // Action nền tảng (TIP-045b): hoàn tác là thao tác nền tảng MỚI có điều kiện — không ghi PlatformDb trong transaction tenant.
    const peek = await db.actionLog.findUnique({ where: { id: actionLogId } });
    // TIP-034c §3.3: cha có action hoàn tác riêng → chỉ người làm (hoặc Owner) được biết, không ghi gì, không đổi trạng thái log.
    const mapped = peek ? undoActionOf(peek.actionId) : undefined;
    if (peek && mapped) {
      if (peek.actorId !== ctx.actor.id && peek.onBehalfOfUserId !== ctx.actor.id && !ctx.authz.isOwner) throw new AppError('FORBIDDEN', 403);
      throw new AppError('UNDO_REQUIRES_ACTION', 409, { undo_action: mapped, parent_action_log_id: peek.id });
    }
    const ph = peek ? this.handlers.get(peek.actionId) : undefined;
    if (peek && ph?.undoPlatform) {
      if (!this.platform) throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'PlatformDb chưa cấu hình');
      if (peek.status !== 'succeeded') throw new AppError('CONFLICT', 409, { status: peek.status });
      const now = this.clock.now();
      if (!peek.undoUntil) throw new AppError('UNDO_NOT_SUPPORTED', 409);
      if (peek.undoUntil.getTime() < now.getTime()) throw new AppError('UNDO_EXPIRED', 409);
      if (peek.actorId !== ctx.actor.id && !ctx.authz.isOwner) throw new AppError('FORBIDDEN', 403);
      const r = await undoPlatformAction(this.platform, db, ctx, ph, { ...peek }, now);
      if (r.events && this.kv) await markDirty(this.kv, ctx.workspaceId);
      return { undone: true };
    }
    // TIP-003b: event của handler undo chỉ gom — flush cuối SAU CAS action_log; CAS thua → rollback, không event mồ côi.
    const { events } = await withEventTransaction(db, ctx.workspaceId, async (tx) => {
      const log = await tx.actionLog.findUnique({ where: { id: actionLogId } });
      if (!log) throw new AppError('NOT_FOUND', 404);
      if (log.status === 'undone') throw new AppError('CONFLICT', 409, { status: 'undone' });
      const handler = this.handlers.get(log.actionId);
      if (!handler?.undo || !log.undoUntil) throw new AppError('UNDO_NOT_SUPPORTED', 409);
      const now = this.clock.now();
      if (log.undoUntil.getTime() < now.getTime()) throw new AppError('UNDO_EXPIRED', 409);
      // Người hoàn tác phải là người làm (hoặc Owner) — quyền chi tiết ở TIP-005.
      if (log.actorId !== ctx.actor.id && !ctx.authz.isOwner) throw new AppError('FORBIDDEN', 403);
      await handler.undo(ctx, { ...log, before: log.before, after: log.after, result: log.result, input: log.input }, tx);
      const n = await tx.actionLog.updateMany({
        where: { id: actionLogId, status: 'succeeded' },
        data: { status: 'undone', undoneAt: now, undoneBy: ctx.actor.type === 'user' ? ctx.actor.id : null },
      });
      if (n.count !== 1) throw new AppError('CONFLICT', 409, { status: 'undone' });
    });
    if (events && this.kv) await markDirty(this.kv, ctx.workspaceId);
    return { undone: true };
  }
}
