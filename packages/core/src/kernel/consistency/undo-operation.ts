// Hoàn tác action nền tảng (TIP-045b annex A1): là thao tác MỚI có điều kiện tham chiếu biên nhận gốc — không ghi PlatformDb từ trong
// transaction tenant. Thứ tự: (1) giữ action_log ở trạng thái `undoing` (tenant, có điều kiện succeeded) → (2) transaction nền tảng chạy
// `undoPlatform` (điều kiện trên trạng thái hiện tại + epoch) → (3) tenant: undone + outbox. Lỗi ở (2) trả log về `succeeded`; chết giữa
// (2) và (3) → log kẹt `undoing` có mốc — khôi phục đọc biên nhận hoàn tác nền tảng (`action_operation` id = `undo:<log>`) để chốt.
import { AppError } from '@appchat/shared';
import type { PlatformDb, TenantDb } from '@appchat/db';
import type { ActionContext } from '../actions/action-context';
import type { ActionHandler, ActionLogRow } from '../actions/handler';
import { uuidv7 } from '../ids';
import { writeOutbox } from '../outbox/outbox';
import { actorKeyOf } from './operation-store';
import { inEventTransaction } from '../outbox/transaction';

export async function undoPlatformAction(
  platform: PlatformDb,
  db: TenantDb,
  ctx: ActionContext,
  handler: ActionHandler,
  log: ActionLogRow & { actorId: string | null },
  now: Date,
): Promise<{ events: number }> {
  // (1) giữ chỗ: chỉ một lần hoàn tác chạy (hai lần bấm song song → một thắng).
  const held = await db.actionLog.updateMany({ where: { id: log.id, status: 'succeeded' }, data: { status: 'undoing' } });
  if (held.count !== 1) throw new AppError('CONFLICT', 409, { status: 'undone' });
  let events: { topic: string; payload: Record<string, unknown> }[] = [];
  try {
    // (2) thao tác nền tảng mới, khoá idempotency theo log gốc: chạy lại không hoàn tác hai lần.
    events = await platform.$transaction(async (ptx) => {
      const key = `undo:${log.id}`;
      const prev = await ptx.actionOperation.findUnique({ where: { workspaceId_actorKey_idempotencyKey: { workspaceId: ctx.workspaceId, actorKey: actorKeyOf(ctx.actor), idempotencyKey: key } } });
      if (prev?.phase === 'complete') return ((prev.result as { events?: typeof events } | null)?.events ?? []);
      const r = await handler.undoPlatform!(ctx, log, ptx);
      const ev = r.events ?? [];
      await ptx.actionOperation.create({
        data: {
          id: uuidv7(now.getTime()),
          workspaceId: ctx.workspaceId,
          actorKey: actorKeyOf(ctx.actor),
          idempotencyKey: key,
          actionId: `${log.actionId}#undo`,
          inputHash: log.id,
          phase: 'complete',
          context: { source: ctx.source, actor: ctx.actor, risk: 'config', at: now.toISOString(), undoOf: log.id },
          result: { events: ev } as object,
          actionLogId: log.id,
          createdAt: now,
          updatedAt: now,
        },
      });
      return ev;
    });
  } catch (e) {
    await db.actionLog.updateMany({ where: { id: log.id, status: 'undoing' }, data: { status: 'succeeded' } });
    throw e;
  }
  // (3) chốt tenant + event.
  const n = await inEventTransaction(db, ctx.workspaceId, async (tx) => {
    await tx.actionLog.updateMany({
      where: { id: log.id, status: 'undoing' },
      data: { status: 'undone', undoneAt: now, undoneBy: ctx.actor.type === 'user' ? ctx.actor.id : null },
    });
    return writeOutbox(tx, ctx.workspaceId, events, now);
  });
  return { events: n };
}
