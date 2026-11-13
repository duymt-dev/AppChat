// Kết quả thao tác ticket hàng loạt từ BIÊN NHẬN (TIP-034c §1.2 / §1.6): theo thứ tự id đã chuẩn hoá lúc nhận; id không vào việc (không
// phải uuid) → NOT_FOUND; biên nhận còn pending → `pending` khi việc đang chạy, `NOT_APPLIED` khi việc đã kết thúc (huỷ / người tạo mất
// quyền). Chỉ id + mã an toàn + changed — không tiêu đề / trạng thái / người phụ trách; id ẩn chỉ được nhắc lại như id người gọi đã gửi.
import type { TenantDb } from '@appchat/db';
import type { DataJobStatus, TicketBulkOutcome, TicketBulkResult, TicketBulkUndoResult } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';

export const TICKET_BULK_KIND = 'ticket.bulk_update';
export const TICKET_BULK_UNDO_KIND = 'ticket.bulk_undo';
export const TICKET_BULK_ACTOR = 'ticket-bulk';

/** Input lưu ở data_job (đi): id chuẩn hoá (cả id lạ — để trả đúng thứ tự), patch chuẩn, số trùng đã gộp. */
export interface BulkJobInput {
  ids: string[];
  patch: { assignee?: { kind: 'user' | 'agent'; id: string }; priority?: 'high' | 'medium' | 'low' };
  duplicates: number;
}

/** Input lượt hoàn tác: thao tác đi + action_log của nó + hạn hoàn tác (tính từ lúc nhận thao tác đi). */
export interface UndoJobInput {
  forward_job_id: string;
  parent_action_log_id: string;
  deadline: string;
  ids: string[];
}

type Db = Pick<TenantDb | TenantTx, 'dataJob' | 'dataJobItem'>;
type Job = { id: string; status: string; total: number; input: unknown };
const TERMINAL = new Set(['completed', 'cancelled', 'failed']);
const codeOf = (outcome: string | null, error: string | null) => outcome ?? (error ? error.split(':')[0]! : 'INTERNAL');

async function project(db: Db, job: Job, ids: readonly string[]) {
  const rows = await db.dataJobItem.findMany({ where: { jobId: job.id }, orderBy: { seq: 'asc' }, select: { targetId: true, status: true, outcomeCode: true, error: true, changed: true } });
  const by = new Map(rows.map((r) => [r.targetId, r]));
  const done = TERMINAL.has(job.status);
  const outcomes: TicketBulkOutcome[] = ids.map((id) => {
    const r = by.get(id);
    if (!r) return { id, ok: false, error: { code: 'NOT_FOUND' } };
    if (r.status === 'done') return { id, ok: true, changed: r.changed === true };
    if (r.status === 'pending') return done ? { id, ok: false, error: { code: 'NOT_APPLIED' } } : { id, ok: false, pending: true };
    if (r.status === 'skipped') return { id, ok: false, error: { code: 'NOT_APPLIED' } };
    return { id, ok: false, error: { code: codeOf(r.outcomeCode, r.error) } };
  });
  const pending = outcomes.filter((o) => o.pending).length;
  return { outcomes, operation: { job_id: job.id, status: job.status as DataJobStatus, total: job.total, pending } };
}

export async function bulkResultOf(db: Db, job: Job): Promise<TicketBulkResult> {
  const input = job.input as BulkJobInput;
  const { outcomes, operation } = await project(db, job, input.ids);
  const ok = outcomes.filter((o) => o.ok);
  return {
    updated: ok.length,
    changed_count: ok.filter((o) => o.changed).length,
    failed: outcomes.filter((o) => !o.ok && !o.pending).length,
    duplicates: input.duplicates,
    outcomes,
    operation,
  };
}

export async function undoResultOf(db: Db, job: Job): Promise<TicketBulkUndoResult> {
  const { outcomes, operation } = await project(db, job, (job.input as UndoJobInput).ids);
  const failed = outcomes.filter((o) => !o.ok && !o.pending);
  return { undone: outcomes.filter((o) => o.ok).length, conflicts: failed.filter((o) => o.error?.code === 'CONFLICT').length, failed: failed.length, outcomes, operation };
}

/** Đọc kết quả theo id việc (route trạng thái việc — chỉ người tạo còn quyền, DataJobStatusService đã kiểm). */
export async function ticketJobResult(db: TenantDb, jobId: string): Promise<TicketBulkResult | TicketBulkUndoResult | null> {
  const job = await db.dataJob.findUnique({ where: { id: jobId }, select: { id: true, kind: true, status: true, total: true, input: true } });
  if (!job) return null;
  return job.kind === TICKET_BULK_UNDO_KIND ? undoResultOf(db, job) : bulkResultOf(db, job);
}
