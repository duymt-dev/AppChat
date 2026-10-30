// POST /v1/action-logs/:id/undo (Blueprint §4.3): trong hạn → handler.undo + status=undone; quá hạn / không hỗ trợ → 409.
import { AppError } from '@appchat/shared';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import type { Clock } from '../clock';
import type { ActionContext } from './action-context';
import type { ActionHandlerRegistry } from './handler-registry';

export class UndoService {
  constructor(
    private readonly handlers: ActionHandlerRegistry,
    private readonly resolver: TenantDbResolver,
    private readonly clock: Clock,
  ) {}

  async undo(ctx: ActionContext, actionLogId: string): Promise<{ undone: true }> {
    const db = await this.resolver.get(TenantContexts.system(ctx.workspaceId, 'action:undo'));
    return db.$transaction(async (tx) => {
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
      return { undone: true as const };
    });
  }
}
