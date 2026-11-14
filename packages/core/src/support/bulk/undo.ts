// ticket.bulk_undo + con riêng ticket.bulk_item_undo (TIP-034c §2.6 / §3.1–3.2). Chỉ NGƯỜI TẠO thao tác đi (chủ data_job 045b) + quyền
// ticket.manage HIỆN TẠI; hạn 24 giờ tính từ lúc nhận thao tác đi. Thao tác đi phải đã kết thúc (huỷ / lỗi = đã dừng hẳn — runner chỉ kết
// thúc sau khi con đang chạy commit xong) — còn chạy → 409 OPERATION_BUSY. Xem trước ràng digest tập "đã đổi thành công" + trạng thái việc;
// xác nhận dưới CÙNG khoá dòng data_job của nhận việc / thử lại / huỷ: kiểm lại, niêm phong (`undo_seal`) → thao tác đi không thử lại /
// nhận thêm được nữa; hai yêu cầu hội tụ một lượt hoàn tác (parent_job_id duy nhất). Mỗi ticket một con: còn đúng version + dấu giá trị
// sau ghi → khôi phục CHỈ trường đã đổi; bị sửa sau đó → CONFLICT riêng ticket đó. action_log cha chỉ thành `undone` khi MỌI con đã hoàn tác.
import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { AppError, BULK_SYNC_MAX, type TicketBulkUndoResult } from '@appchat/shared';
import type { TenantDb } from '@appchat/db';
import type { ActionInput, ActionPreview, ticketBulkItemUndo, ticketBulkUndo } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { jobAccepted } from '../../kernel/actions/job-accepted';
import { line, preview } from '../../kernel/actions/preview-kit';
import { runDataJob, type KindContext } from '../../kernel/jobs/bulk-dispatch';
import { allowedAction } from '../../kernel/jobs/bulk-status';
import { createJob } from '../../kernel/jobs/data-jobs/store';
import { dataJobUrl } from '../../kernel/jobs/data-jobs/handlers';
import { isPrivacyFenced } from '../../kernel/privacy/guard';
import { CrmMembers, actorUserId } from '../../crm/public';
import { lockTicket } from '../ticket-access';
import { actorOf, evOf, logEvent, type Ev } from '../services/ticket-write';
import { assertItemCapability, lockJobFor, pendingItem } from './item';
import { recipientCols, revertTicketPatch, type TicketReceipt } from './mutations';
import { TicketBulkDeps } from './providers';
import { TICKET_BULK_KIND, TICKET_BULK_UNDO_KIND, undoResultOf, type UndoJobInput } from './results';

type In = ActionInput<typeof ticketBulkUndo>;
type ItemIn = ActionInput<typeof ticketBulkItemUndo>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BUSY = new Set(['queued', 'running', 'cancelling']);

type Forward = { id: string; status: string; actor_id: string | null; undo_seal: string | null; action_log_id: string; finished_at: Date | null };

/** Thao tác đi của action_log + log (hạn hoàn tác). Không phải của mình / không có → 404 như không tồn tại; log hàng loạt cũ → 409. */
async function forwardOf(tx: TenantTx, ctx: ActionContext, logId: string, lock: boolean, now: Date) {
  const log = UUID.test(logId) ? await tx.actionLog.findUnique({ where: { id: logId }, select: { id: true, actionId: true, status: true, undoUntil: true } }) : null;
  if (!log || log.actionId !== 'ticket.bulk_update') throw new AppError('NOT_FOUND', 404, { parent_action_log_id: 'not_found' });
  const rows = lock
    ? await tx.$queryRaw<Forward[]>`SELECT id, status, actor_id, undo_seal, action_log_id, finished_at FROM data_job WHERE action_log_id = ${logId}::uuid AND kind = ${TICKET_BULK_KIND} FOR UPDATE`
    : await tx.$queryRaw<Forward[]>`SELECT id, status, actor_id, undo_seal, action_log_id, finished_at FROM data_job WHERE action_log_id = ${logId}::uuid AND kind = ${TICKET_BULK_KIND}`;
  const job = rows[0];
  // Log trước TIP-034c không có biên nhận đáng tin → không đoán bản chụp an toàn.
  if (!job) throw new AppError('UNDO_NOT_SUPPORTED', 409, { parent_action_log_id: 'legacy' });
  if (!job.actor_id || job.actor_id !== actorUserId(ctx) || !allowedAction(ctx.authz, 'ticket.bulk_update')) throw new AppError('NOT_FOUND', 404, { parent_action_log_id: 'not_found' });
  if (log.status === 'undone') throw new AppError('CONFLICT', 409, { status: 'undone' });
  if (!log.undoUntil || log.undoUntil.getTime() < now.getTime()) throw new AppError('UNDO_EXPIRED', 409);
  return { log: { ...log, undoUntil: log.undoUntil }, job };
}

/** Tập "đã đổi thành công" (bất biến sau khi thao tác đi kết thúc) + digest gồm trạng thái việc (revision). */
async function changedSet(tx: TenantTx, job: Forward) {
  const items = await tx.dataJobItem.findMany({ where: { jobId: job.id, status: 'done', changed: true, generation: 0 }, orderBy: { seq: 'asc' }, select: { seq: true, targetId: true, afterVersion: true, undoState: true } });
  const digest = createHash('sha256').update(JSON.stringify([job.status, job.finished_at?.toISOString() ?? null, items.map((i) => [i.seq, i.targetId, i.afterVersion])])).digest('hex');
  return { items, digest };
}

@Injectable()
@ActionHandler('ticket.bulk_undo')
export class TicketBulkUndoHandler implements Handler<In, TicketBulkUndoResult> {
  constructor(@Inject(TicketBulkDeps) private readonly d: TicketBulkDeps) {}

  async preview(ctx: ActionContext, input: In, tx: TenantTx): Promise<ActionPreview> {
    const { log, job } = await forwardOf(tx, ctx, input.parent_action_log_id, false, this.d.now());
    if (BUSY.has(job.status)) throw new AppError('OPERATION_BUSY', 409, { status: job.status });
    const { items } = await changedSet(tx, job);
    const tickets = items.length ? await tx.ticket.findMany({ where: { id: { in: items.map((i) => i.targetId) } }, select: { id: true, version: true } }) : [];
    const cur = new Map(tickets.map((t) => [t.id, t.version]));
    const open = items.filter((i) => i.undoState === 'eligible' || i.undoState === null);
    const conflicts = open.filter((i) => cur.get(i.targetId) !== i.afterVersion).length;
    return preview('write', line(`${open.length - conflicts}`, log.id.slice(-6)), {
      count: open.length - conflicts,
      changes: [{ entity: 'ticket_bulk_undo', after: { revert: open.length - conflicts, ...(conflicts ? { conflicts } : {}), ...(job.undo_seal ? { sealed: 1 } : {}) } }],
      ...(conflicts ? { warnings: ['undo_conflicts_kept'] } : {}),
    });
  }

  async bindPreview(ctx: ActionContext, input: In, tx: TenantTx): Promise<Record<string, string>> {
    const { job } = await forwardOf(tx, ctx, input.parent_action_log_id, false, this.d.now());
    return { receipts: (await changedSet(tx, job)).digest };
  }

  async execute(ctx: ActionContext, input: In, tx: TenantTx): Promise<HandlerOutcome<TicketBulkUndoResult>> {
    const now = this.d.now();
    const { log, job } = await forwardOf(tx, ctx, input.parent_action_log_id, true, now);
    // Đã niêm phong (yêu cầu khác / khôi phục sau sập) → cùng một lượt hoàn tác, không dựng tập nhỏ hơn.
    const sealed = job.undo_seal ? await tx.dataJob.findFirst({ where: { parentJobId: job.id }, select: { id: true, status: true, total: true, input: true } }) : null;
    if (sealed) return { result: await undoResultOf(tx, sealed), after: { undo_job_id: sealed.id, converged: true }, noUndo: true, ...this.tail(ctx.workspaceId, sealed.id, sealed.total) };
    if (BUSY.has(job.status)) throw new AppError('OPERATION_BUSY', 409, { status: job.status });
    const { items, digest } = await changedSet(tx, job);
    if (ctx.previewFacts?.receipts !== undefined && ctx.previewFacts.receipts !== digest) throw new AppError('STALE_VERSION', 409, { receipts: 'changed' });
    await tx.dataJob.update({ where: { id: job.id }, data: { undoSeal: digest, updatedAt: now } });
    const ids = items.map((i) => i.targetId);
    const undoInput: UndoJobInput = { forward_job_id: job.id, parent_action_log_id: log.id, deadline: log.undoUntil.toISOString(), ids };
    const undoId = await createJob(tx, { kind: TICKET_BULK_UNDO_KIND, actionId: 'ticket.bulk_undo', actorId: job.actor_id, actionLogId: null, input: undoInput, targets: ids, generation: 1, parentJobId: job.id, now });
    if (ids.length) await tx.dataJobItem.updateMany({ where: { jobId: job.id, status: 'done', changed: true, generation: 0 }, data: { undoState: 'pending', updatedAt: now } });
    else await tx.actionLog.updateMany({ where: { id: log.id, status: 'succeeded' }, data: { status: 'undone', undoneAt: now, undoneBy: actorUserId(ctx) } });
    const row = { id: undoId, status: 'queued', total: ids.length, input: undoInput };
    return { result: await undoResultOf(tx, row), after: { undo_job_id: undoId, total: ids.length, seal: digest }, noUndo: true, ...this.tail(ctx.workspaceId, undoId, ids.length) };
  }

  /** ≤ 50 → chạy con sau commit + phản hồi từ biên nhận; > 50 → 202. */
  private tail(ws: string, jobId: string, total: number): Pick<HandlerOutcome<TicketBulkUndoResult>, 'afterCommit' | 'settled' | 'accepted' | 'events'> {
    if (total > BULK_SYNC_MAX) return { events: [{ topic: 'data_job.requested', payload: { job_id: jobId, kind: TICKET_BULK_UNDO_KIND } }], ...jobAccepted(jobId, dataJobUrl(jobId)) };
    const db = () => this.d.db(ws, 'ticket.bulk_undo');
    return {
      afterCommit: async () => void (await runDataJob(await db(), ws, jobId, { authzOf: (w, u) => this.d.authzOf(w, u), allowed: allowedAction, now: this.d.now, owner: `api:undo:${process.pid}` })),
      settled: async () => {
        const t = await db();
        return undoResultOf(t, await t.dataJob.findUniqueOrThrow({ where: { id: jobId }, select: { id: true, status: true, total: true, input: true } }));
      },
    };
  }
}

/** Trạng thái hoàn tác của biên nhận đi (lượt hoàn tác lỗi / xung đột) — runner gọi khi con thất bại. */
export async function markForwardUndo(db: Pick<TenantDb, 'dataJobItem'>, c: KindContext, targetId: string, code: string) {
  const fwd = (c.job.input as UndoJobInput).forward_job_id;
  await db.dataJobItem.updateMany({ where: { jobId: fwd, targetId, generation: 0, undoState: 'pending' }, data: { undoState: code === 'CONFLICT' ? 'conflict' : 'failed' } });
}

@Injectable()
@ActionHandler('ticket.bulk_item_undo')
export class TicketBulkItemUndoHandler implements Handler<ItemIn, { ticket_id: string; changed: boolean; version: number }> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(TicketBulkDeps) private readonly d: TicketBulkDeps,
  ) {}

  async preview(): Promise<never> {
    throw new AppError('FORBIDDEN', 403, { capability: 'internal' });
  }

  async execute(ctx: ActionContext, i: ItemIn, tx: TenantTx): Promise<HandlerOutcome<{ ticket_id: string; changed: boolean; version: number }>> {
    assertItemCapability(ctx, i);
    const now = this.d.now();
    const job = await lockJobFor(tx, ctx, i, TICKET_BULK_UNDO_KIND);
    await pendingItem(tx, i, 1);
    const u = job.input as UndoJobInput;
    // Hạn tính từ lúc nhận thao tác đi — con hoàn tác không kéo dài hạn.
    if (new Date(u.deadline).getTime() < now.getTime()) throw new AppError('UNDO_EXPIRED', 409);
    const fwd = await tx.dataJobItem.findUnique({ where: { jobId_targetId_generation: { jobId: u.forward_job_id, targetId: i.ticket_id, generation: 0 } } });
    if (!fwd || fwd.status !== 'done' || !fwd.changed || !fwd.receipt || fwd.afterVersion === null) throw new AppError('CONFLICT', 409, { receipt: 'missing' });
    const t = await lockTicket(tx, ctx.authz, i.ticket_id);
    if (t.contactId && (await isPrivacyFenced(tx, t.contactId))) throw new AppError('NOT_FOUND', 404, { ticket_id: 'not_found' });
    const receipt = fwd.receipt as unknown as TicketReceipt;
    // Người nhận cũ phải còn hợp lệ ngay bây giờ (thành viên đang hoạt động / agent chưa xoá).
    const restore = (prev: { user: string | null; agent: string | null }) =>
      recipientCols(ctx.workspaceId, tx, this.members, prev.user ? { kind: 'user', id: prev.user } : { kind: 'agent', id: prev.agent! });
    const row = await revertTicketPatch(tx, t, { receipt, afterVersion: fwd.afterVersion }, restore, now);
    const actor = await actorOf(ctx, tx, this.members);
    const events: Ev[] = [];
    if (receipt.fields.includes('assignee')) {
      await logEvent(tx, t.id, 'assigned', actor, now, { user_id: row.assigneeUserId, agent_id: row.assigneeAgentId, undo: true });
      events.push(evOf('ticket.assigned', row, { by_user_id: actorUserId(ctx) }));
    }
    if (receipt.fields.includes('priority')) {
      await logEvent(tx, t.id, 'priority', actor, now, { priority: row.priority, undo: true });
      if (!receipt.fields.includes('assignee')) events.push(evOf('ticket.updated', row));
    }
    const n = await tx.dataJobItem.updateMany({ where: { jobId: i.job_id, seq: i.seq, status: 'pending' }, data: { status: 'done', changed: true, afterVersion: row.version, updatedAt: now } });
    if (n.count !== 1) throw new AppError('CONFLICT', 409, { item: 'taken' });
    await tx.dataJobItem.update({ where: { jobId_seq: { jobId: fwd.jobId, seq: fwd.seq } }, data: { undoState: 'undone', updatedAt: now } });
    // Mọi con của tập niêm phong đã hoàn tác → action_log đi mới thành `undone` (một phần → giữ succeeded, trạng thái theo biên nhận).
    const left = await tx.dataJobItem.count({ where: { jobId: i.job_id, status: { not: 'done' } } });
    if (!left) await tx.actionLog.updateMany({ where: { id: u.parent_action_log_id, status: 'succeeded' }, data: { status: 'undone', undoneAt: now, undoneBy: ctx.onBehalfOfUserId ?? null } });
    return { result: { ticket_id: t.id, changed: true, version: row.version }, before: receipt.after, after: { job_id: i.job_id, values: receipt.before, version: row.version }, events, noUndo: true };
  }
}
