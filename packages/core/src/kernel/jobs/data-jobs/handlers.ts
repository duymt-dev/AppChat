// data_job.cancel · data_job.retry (TIP-045b annex D). Chỉ NGƯỜI TẠO việc + còn quyền action gốc (khác → 404 như không có). Huỷ: CAS
// queued / running → cancelling (worker dừng ở ranh giới bản ghi kế, phần đã ghi giữ nguyên). Thử lại: việc đã kết thúc có bản ghi lỗi →
// đặt lại CHỈ bản ghi failed về pending + queued + event mới; input giữ nguyên (hash kiểm toàn vẹn) — bản ghi đã xong không ghi lần hai.
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, dataJobCancel, dataJobRetry } from '@appchat/actions';
import { CLOCK, type Clock } from '../../clock';
import type { ActionContext, TenantTx } from '../../actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../actions/handler';
import { jobAccepted } from '../../actions/job-accepted';
import { line, preview } from '../../actions/preview-kit';
import { inputHash } from './store';
import { allowedAction } from '../bulk-status';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const dataJobUrl = (id: string) => `/v1/data-jobs/${id}`;
const actorOf = (ctx: ActionContext) => ctx.onBehalfOfUserId ?? (ctx.actor.type === 'user' ? ctx.actor.id : null);

async function lockJob(tx: TenantTx, ctx: ActionContext, id: string) {
  const rows = UUID.test(id) ? await tx.$queryRaw<{ id: string }[]>`SELECT id FROM data_job WHERE id = ${id}::uuid FOR UPDATE` : [];
  const job = rows[0] ? await tx.dataJob.findUnique({ where: { id } }) : null;
  const actor = actorOf(ctx);
  if (!job || !actor || job.actorId !== actor || !allowedAction(ctx.authz, job.actionId)) throw new AppError('NOT_FOUND', 404, { job_id: 'not_found' });
  return job;
}

@Injectable()
@ActionHandler('data_job.cancel')
export class DataJobCancelHandler implements Handler<ActionInput<typeof dataJobCancel>, { status: string }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof dataJobCancel>, tx: TenantTx): Promise<HandlerOutcome<{ status: string }>> {
    const job = await lockJob(tx, ctx, input.job_id);
    if (job.status === 'cancelling' || job.status === 'cancelled') return { result: { status: job.status } };
    if (job.status !== 'queued' && job.status !== 'running') throw new AppError('INVALID_STATE', 409, { status: job.status });
    await tx.dataJob.update({ where: { id: job.id }, data: { status: 'cancelling', updatedAt: this.clock.now() } });
    // Event đánh thức worker cho việc chưa ai giữ (queued) — worker giành lease thấy cancelling → kết thúc cancelled.
    return { result: { status: 'cancelling' }, before: { id: job.id, status: job.status }, after: { id: job.id, status: 'cancelling' }, events: [{ topic: 'data_job.requested', payload: { job_id: job.id, kind: job.kind } }] };
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof dataJobCancel>, tx: TenantTx) {
    const job = await lockJob(tx, ctx, input.job_id);
    const done = await tx.dataJobItem.count({ where: { jobId: job.id, status: 'done' } });
    return preview('write', line(job.kind, job.status), { changes: [{ entity: 'data_job', id: job.id, before: { status: job.status }, after: { status: 'cancelling' } }], ...(done ? { warnings: [`committed:${done}`] } : {}) });
  }
}

@Injectable()
@ActionHandler('data_job.retry')
export class DataJobRetryHandler implements Handler<ActionInput<typeof dataJobRetry>, { status: string; retried: number }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof dataJobRetry>, tx: TenantTx): Promise<HandlerOutcome<{ status: string; retried: number }>> {
    const job = await lockJob(tx, ctx, input.job_id);
    if (!['failed', 'cancelled', 'completed'].includes(job.status)) throw new AppError('INVALID_STATE', 409, { status: job.status });
    if (inputHash(job.input) !== job.inputHash) throw new AppError('INVALID_STATE', 409, { input: 'changed' });
    // TIP-034c §3.1: tập "đã đổi thành công" đã niêm phong cho hoàn tác → thao tác đi không nhận thêm bản ghi nào nữa.
    if (job.undoSeal) throw new AppError('INVALID_STATE', 409, { undo: 'sealed' });
    const now = this.clock.now();
    const r = await tx.dataJobItem.updateMany({ where: { jobId: job.id, status: 'failed' }, data: { status: 'pending', error: null, updatedAt: now } });
    // Xuất tệp: bản ghi chỉ đánh dấu done khi tệp đã ghi xong — huỷ / lỗi giữa chừng còn pending → chạy lại dựng tệp từ đầu (cùng tập id).
    const pending = await tx.dataJobItem.count({ where: { jobId: job.id, status: 'pending' } });
    if (!pending) throw new AppError('INVALID_STATE', 409, { items: 'nothing_to_retry' });
    await tx.dataJob.update({ where: { id: job.id }, data: { status: 'queued', error: null, finishedAt: null, leaseOwner: null, leaseUntil: null, updatedAt: now } });
    return {
      result: { status: 'queued', retried: r.count },
      before: { id: job.id, status: job.status },
      after: { id: job.id, status: 'queued', retried: r.count },
      events: [{ topic: 'data_job.requested', payload: { job_id: job.id, kind: job.kind } }],
      ...jobAccepted(job.id, dataJobUrl(job.id)),
    };
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof dataJobRetry>, tx: TenantTx) {
    const job = await lockJob(tx, ctx, input.job_id);
    const failed = await tx.dataJobItem.count({ where: { jobId: job.id, status: 'failed' } });
    return preview('write', line(job.kind, job.status), { count: failed, changes: [{ entity: 'data_job', id: job.id, before: { status: job.status }, after: { status: 'queued', retry: failed } }] });
  }
}
