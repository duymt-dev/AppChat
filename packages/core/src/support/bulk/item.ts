// Con riêng `ticket.bulk_item` (TIP-034c §2.1–2.2): MỘT ticket của thao tác cha đã nhận, một transaction — khoá việc (đúng fence của lease,
// chưa huỷ, chưa niêm phong hoàn tác) → biên nhận còn pending → ticket (scope ghi HIỆN TẠI của người tạo, chặn privacy 015c, chưa đóng,
// đúng version đã nhận) → kiểm lại người nhận + CẢ patch → một UPDATE + lịch sử + outbox + biên nhận cùng commit. Lỗi ở bất kỳ bước nào
// → rollback cả ticket đó (không còn nửa patch), runner ghi biên nhận failed với mã an toàn; ticket khác vẫn chạy.
import { Inject, Injectable } from '@nestjs/common';
import { AppError, TICKET_BULK_OUTCOME_CODES } from '@appchat/shared';
import type { TenantDb } from '@appchat/db';
import type { ActionInput, ticketBulkItem } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { runSystemAction, systemCapabilityOf, type SystemTrigger } from '../../kernel/actions/system';
import { allowedAction } from '../../kernel/jobs/bulk-status';
import type { KindContext } from '../../kernel/jobs/bulk-dispatch';
import type { JobLease } from '../../kernel/jobs/data-jobs/store';
import { isPrivacyFenced } from '../../kernel/privacy/guard';
import { CrmMembers } from '../../crm/public';
import { lockTicket } from '../ticket-access';
import { actorOf } from '../services/ticket-write';
import { applyTicketPatch, recipientCols } from './mutations';
import { TICKET_BULK_ACTOR, TICKET_BULK_KIND, TICKET_BULK_UNDO_KIND, type BulkJobInput } from './results';
import type { TicketBulkDeps } from './providers';

type In = ActionInput<typeof ticketBulkItem>;
type Out = { ticket_id: string; changed: boolean; version: number };
type JobRow = { id: string; kind: string; status: string; fence: number; actor_id: string | null; undo_seal: string | null; parent_job_id: string | null; input: unknown };

/** Việc của con: khoá chia sẻ (huỷ / thử lại / niêm phong chờ con đang chạy xong), đúng loại + fence + người tạo, chưa huỷ. */
export async function lockJobFor(tx: TenantTx, ctx: ActionContext, i: Pick<In, 'job_id' | 'fence'>, kind: string): Promise<JobRow> {
  const [j] = await tx.$queryRaw<JobRow[]>`
    SELECT id, kind, status, fence, actor_id, undo_seal, parent_job_id, input FROM data_job WHERE id = ${i.job_id}::uuid FOR SHARE`;
  if (!j || j.kind !== kind || !j.actor_id || j.actor_id !== ctx.onBehalfOfUserId) throw new AppError('FORBIDDEN', 403, { capability: 'job' });
  if (j.status === 'cancelling' || j.status === 'cancelled') throw new AppError('CONFLICT', 409, { job: 'cancelling' });
  if (j.fence !== i.fence || j.status !== 'running') throw new AppError('CONFLICT', 409, { job: 'fence' });
  return j;
}

/** Biên nhận pending của đúng (việc, seq, ticket, thế hệ) — đã có kết quả → `taken` (không chạy lần hai). */
export async function pendingItem(tx: TenantTx, i: Pick<In, 'job_id' | 'seq' | 'ticket_id'>, generation: number) {
  const it = await tx.dataJobItem.findUnique({ where: { jobId_seq: { jobId: i.job_id, seq: i.seq } } });
  if (!it || it.targetId !== i.ticket_id || it.generation !== generation) throw new AppError('FORBIDDEN', 403, { capability: 'item' });
  if (it.status !== 'pending') throw new AppError('CONFLICT', 409, { item: 'taken' });
  return it;
}

/** Capability niêm phong khớp đúng việc + ticket + seq của input. */
export function assertItemCapability(ctx: ActionContext, i: Pick<In, 'job_id' | 'seq' | 'ticket_id'>) {
  const cap = systemCapabilityOf(ctx);
  if (!cap || cap.sourceRef !== i.job_id || cap.targetId !== i.ticket_id || cap.generation !== String(i.seq)) throw new AppError('FORBIDDEN', 403, { capability: 'missing' });
}

@Injectable()
@ActionHandler('ticket.bulk_item')
export class TicketBulkItemHandler implements Handler<In, Out> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async preview(): Promise<never> {
    throw new AppError('FORBIDDEN', 403, { capability: 'internal' });
  }

  async execute(ctx: ActionContext, i: In, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    assertItemCapability(ctx, i);
    const now = this.clock.now();
    const job = await lockJobFor(tx, ctx, i, TICKET_BULK_KIND);
    if (job.undo_seal) throw new AppError('CONFLICT', 409, { job: 'cancelling' });
    const it = await pendingItem(tx, i, 0);
    const patch = (job.input as BulkJobInput).patch;
    const t = await lockTicket(tx, ctx.authz, i.ticket_id);
    // 015c: khách của ticket đang / đã "quên" → như không thấy (không lộ lý do).
    if (t.contactId && (await isPrivacyFenced(tx, t.contactId))) throw new AppError('NOT_FOUND', 404, { ticket_id: 'not_found' });
    if (t.status === 'closed') throw new AppError('INVALID_TRANSITION', 409, { status: 'closed' });
    if (it.admittedVersion !== null && t.version !== it.admittedVersion) throw new AppError('STALE_VERSION', 409, { version: String(t.version) });
    // Cả patch hợp lệ TRƯỚC khi ghi: người nhận không còn hợp lệ → không ghi cả ưu tiên.
    const cols = patch.assignee ? await recipientCols(ctx.workspaceId, tx, this.members, patch.assignee) : null;
    const r = await applyTicketPatch(ctx, tx, t, { cols, priority: patch.priority }, await actorOf(ctx, tx, this.members), now);
    const n = await tx.dataJobItem.updateMany({
      where: { jobId: i.job_id, seq: i.seq, status: 'pending' },
      data: { status: 'done', outcomeCode: null, error: null, changed: r.changed, afterVersion: r.row.version, ...(r.receipt ? { receipt: r.receipt as object } : {}), undoState: r.changed ? 'eligible' : null, updatedAt: now },
    });
    if (n.count !== 1) throw new AppError('CONFLICT', 409, { item: 'taken' });
    return {
      result: { ticket_id: t.id, changed: r.changed, version: r.row.version },
      before: r.receipt?.before ?? null,
      after: { job_id: i.job_id, ...(r.receipt ? { fields: r.receipt.fields, values: r.receipt.after } : {}), version: r.row.version },
      events: r.events,
      noUndo: true,
    };
  }
}

/** Verifier nguồn (003c): việc + biên nhận đã lưu khớp trigger — không tin payload queue. */
export async function verifyBulkItem(t: Readonly<SystemTrigger>, db: TenantDb): Promise<void> {
  const i = t.input as Partial<In>;
  if (t.sourceKind !== 'accepted_operation' || t.actor !== TICKET_BULK_ACTOR || i.job_id !== t.sourceRef || i.ticket_id !== t.targetId || String(i.seq) !== t.generation) throw new AppError('CONFLICT', 409, { trigger: 'stale' });
  const it = await db.dataJobItem.findUnique({ where: { jobId_seq: { jobId: i.job_id!, seq: i.seq! } }, select: { targetId: true, job: { select: { kind: true } } } });
  const kind = t.actionId === 'ticket.bulk_item' ? TICKET_BULK_KIND : TICKET_BULK_UNDO_KIND;
  if (!it || it.targetId !== t.targetId || it.job.kind !== kind) throw new AppError('NOT_FOUND', 404, { trigger: 'source_not_found' });
}

const SAFE = new Set<string>(TICKET_BULK_OUTCOME_CODES);

/** Biên nhận failed — chỉ khi lease còn của mình (worker cũ mất lease không ghi kết quả). */
async function failItem(db: TenantDb, l: JobLease, seq: number, code: string, now: Date) {
  return db.$executeRaw`
    UPDATE data_job_item SET status = 'failed', outcome_code = ${code}, error = ${code}, updated_at = ${now}
     WHERE job_id = ${l.id}::uuid AND seq = ${seq} AND status = 'pending'
       AND EXISTS (SELECT 1 FROM data_job WHERE id = ${l.id}::uuid AND lease_owner = ${l.owner} AND fence = ${l.fence})`;
}

/**
 * Runner `dispatch` (045b) cho con riêng: quyền HIỆN TẠI của người tạo mỗi ticket (mất quyền → dừng cả việc), ctx hệ thống thay mặt người
 * tạo + capability niêm phong (runSystemAction), không Idempotency-Key (thử lại sau lỗi phải chạy lại; biên nhận chống ghi trùng).
 * `onFail` — lượt hoàn tác cập nhật trạng thái hoàn tác của biên nhận đi.
 */
export function itemDispatch(d: TicketBulkDeps, actionId: 'ticket.bulk_item' | 'ticket.bulk_item_undo', onFail?: (db: TenantDb, c: KindContext, targetId: string, code: string) => Promise<void>) {
  return async (c: KindContext, l: JobLease, targetId: string, seq: number) => {
    const authz = await d.authzOf(c.ws, c.job.actorId);
    if (!authz || !allowedAction(authz, c.job.actionId)) return 'forbidden' as const;
    const ctx: ActionContext = { workspaceId: c.ws, source: 'system', actor: { type: 'system', id: TICKET_BULK_ACTOR }, onBehalfOfUserId: c.job.actorId!, authz };
    const input = { job_id: c.job.id, seq, ticket_id: targetId, fence: l.fence };
    try {
      await runSystemAction(d.executor(), d.resolver(), { workspaceId: c.ws, actionId, sourceKind: 'accepted_operation', sourceRef: c.job.id, targetId, generation: String(seq), input, actor: TICKET_BULK_ACTOR }, ctx);
      return 'done' as const;
    } catch (e) {
      const x = e as { code?: string; fields?: Record<string, string> };
      if (x.fields?.item === 'taken') return 'taken' as const;
      if (x.fields?.job === 'cancelling') return 'cancelled' as const;
      if (x.fields?.job === 'fence') return 'lost' as const;
      if (x.code === 'FORBIDDEN' && x.fields?.permission) return 'forbidden' as const;
      const code = x.code && SAFE.has(x.code) ? x.code : 'INTERNAL';
      if ((await failItem(c.db, l, seq, code, d.now())) === 1) await onFail?.(c.db, c, targetId, code);
      return 'done' as const;
    }
  };
}
