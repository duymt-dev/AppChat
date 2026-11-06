// transfer.commit · transfer.cancel (TIP-038b, DC-374). Commit: CAS `if_version` + trạng thái nháp + chưa hết hạn + chính sách dòng lỗi →
// `committing`; ≤ 500 dòng ghi ngay sau commit (afterCommit, cùng runner với việc nền); > 500 → `data_job` kind `transfer.commit` + outbox
// `data_job.requested` cùng transaction → 202. Ghi nghiệp vụ trong runner qua ActionExecutor bằng action domain (quyền hiện tại người tạo
// đọc lại mỗi lô). Preview (bulk — luôn có thẻ xác nhận kèm số dòng): số sẽ ghi / bỏ qua / lỗi + ≤ 20 dòng mẫu sẽ tạo. Cancel: nháp →
// cancelled; đang ghi → huỷ việc nền hợp tác (phần đã ghi giữ nguyên, không hoàn tác giả).
import { Inject, Injectable } from '@nestjs/common';
import {
  AppError,
  TRANSFER_SYNC_DOCS,
  TRANSFER_SYNC_ROWS,
  transferSpec,
  type TransferEntity,
} from '@appchat/shared';
import type { ActionInput, ActionPreview, transferCancel, transferCommit } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import {
  ActionHandler,
  type ActionHandler as Handler,
  type HandlerOutcome,
} from '../../kernel/actions/handler';
import { jobAccepted } from '../../kernel/actions/job-accepted';
import { line, preview } from '../../kernel/actions/preview-kit';
import { createJob } from '../../kernel/jobs/data-jobs/store';
import { dataJobUrl } from '../../kernel/jobs/data-jobs/handlers';
import { actorUserId } from '../../crm/public';
import { TransferDeps } from '../data-transfer.providers';
import { ownPlan } from '../services/planner';
import { commitBlocker, requireImport } from '../services/plan-view';
import { commitPlan } from '../jobs/transfer.runner';
import { TRANSFER_COMMIT_KIND } from '../types';

type CommitIn = ActionInput<typeof transferCommit>;
type CommitOut = {
  plan_id: string;
  status: string;
  applied: number;
  skipped: number;
  failed: number;
  job_id: string | null;
};
type CancelIn = ActionInput<typeof transferCancel>;

async function draftPlan(tx: TenantTx, ctx: ActionContext, i: CommitIn, now: Date) {
  const plan = await ownPlan(tx, i.plan_id, actorUserId(ctx), true);
  if (plan.version !== i.if_version)
    throw new AppError('CONFLICT', 409, { if_version: 'stale', version: String(plan.version) });
  requireImport(ctx.authz, plan.entity as TransferEntity);
  const block = commitBlocker(plan, now);
  if (block) throw new AppError('INVALID_STATE', 409, block);
  return plan;
}

/** Số bản ghi sẽ tạo: khách / sản phẩm = số dòng; báo giá / đơn = số nhóm hợp lệ; hợp đồng / đề nghị = số dòng. */
async function unitCount(tx: TenantTx, plan: { id: string; entity: string; valid: number }) {
  if (!transferSpec(plan.entity as TransferEntity).grouped) return plan.valid;
  const r = await tx.$queryRaw<
    { n: bigint }[]
  >`SELECT count(DISTINCT group_key) AS n FROM transfer_row WHERE plan_id = ${plan.id}::uuid AND "check" = 'valid'`;
  return Number(r[0]?.n ?? 0);
}

/** Chạy nền: khách > 500 dòng (lô contact.import); chứng từ > 50 (mỗi chứng từ một action). Sản phẩm luôn qua product.import (tự chạy nền > 500). */
const runsAsJob = (plan: { entity: string; valid: number }, docs: number) =>
  plan.entity === 'contact'
    ? plan.valid > TRANSFER_SYNC_ROWS
    : plan.entity !== 'product' && docs > TRANSFER_SYNC_DOCS;

@Injectable()
@ActionHandler('transfer.commit')
export class TransferCommitHandler implements Handler<CommitIn, CommitOut> {
  constructor(@Inject(TransferDeps) private readonly d: TransferDeps) {}

  async preview(ctx: ActionContext, i: CommitIn, tx: TenantTx): Promise<ActionPreview> {
    const plan = await draftPlan(tx, ctx, i, this.d.now());
    const sample = await tx.transferRow.findMany({
      where: { planId: plan.id, check: 'valid' },
      orderBy: { rowNo: 'asc' },
      take: 20,
      select: { rowNo: true, data: true },
    });
    const skip = plan.duplicates + (plan.rowPolicy === 'only_valid' ? plan.invalid : 0);
    // Cảnh báo không chặn (lệch giá danh mục / cập nhật SKU có sẵn) — đếm để thẻ xác nhận nói rõ.
    const warn = await tx.$queryRaw<{ k: string; n: bigint }[]>`
      SELECT k, count(*) AS n FROM transfer_row, jsonb_object_keys(errors) k
      WHERE plan_id = ${plan.id}::uuid AND "check" = 'valid' AND right(k, 8) = '_warning' GROUP BY k`;
    const docs = await unitCount(tx, plan);
    return preview('write', line(plan.fileName, `${plan.valid}`), {
      count: docs,
      changes: sample.map((r) => ({
        entity: plan.entity,
        after: { row: r.rowNo, ...(r.data as Record<string, string>) },
      })),
      warnings: [
        ...(skip ? [`skipped:${skip}`] : []),
        ...(plan.duplicates ? [`duplicates:${plan.duplicates}`] : []),
        ...warn.map((w) => `${w.k}:${w.n}`),
        ...(runsAsJob(plan, docs) ? ['mode:job'] : []),
      ],
    });
  }

  async execute(ctx: ActionContext, i: CommitIn, tx: TenantTx): Promise<HandlerOutcome<CommitOut>> {
    const now = this.d.now();
    const plan = await draftPlan(tx, ctx, i, now);
    const ws = ctx.workspaceId;
    const result: CommitOut = {
      plan_id: plan.id,
      status: 'committing',
      applied: 0,
      skipped: 0,
      failed: 0,
      job_id: null,
    };
    const audit = {
      plan_id: plan.id,
      entity: plan.entity,
      version: plan.version,
      file_sha256: plan.fileSha256,
      valid: plan.valid,
      invalid: plan.invalid,
      duplicates: plan.duplicates,
      row_policy: plan.rowPolicy,
      ai_run_id: plan.aiRunId,
    };
    if (runsAsJob(plan, await unitCount(tx, plan))) {
      const jobId = await createJob(tx, {
        kind: TRANSFER_COMMIT_KIND,
        actionId: 'transfer.commit',
        actorId: plan.actorUserId,
        actionLogId: null,
        input: { plan_id: plan.id, version: plan.version },
        targets: [plan.id],
        now,
      });
      await tx.transferPlan.update({
        where: { id: plan.id },
        data: { status: 'committing', jobId, updatedAt: now },
      });
      return {
        result: { ...result, job_id: jobId },
        after: { ...audit, job_id: jobId },
        events: [{ topic: 'data_job.requested', payload: { job_id: jobId, kind: TRANSFER_COMMIT_KIND } }],
        ...jobAccepted(jobId, dataJobUrl(jobId)),
      };
    }
    await tx.transferPlan.update({ where: { id: plan.id }, data: { status: 'committing', updatedAt: now } });
    return {
      result,
      after: audit,
      afterCommit: async () => {
        const db = await this.d.db(ws, 'transfer.commit');
        await commitPlan(db, ws, plan.id, {
          executor: this.d.executor(),
          authzOf: (w, u) => this.d.authzOf(w, u),
          now: this.d.now,
        });
      },
    };
  }
}

@Injectable()
@ActionHandler('transfer.cancel')
export class TransferCancelHandler implements Handler<CancelIn, { plan_id: string; status: string }> {
  constructor(@Inject(TransferDeps) private readonly d: TransferDeps) {}

  /** Huỷ: phần đã ghi giữ nguyên — thẻ nêu số đã ghi nếu đang ghi nền. */
  async preview(ctx: ActionContext, i: CancelIn, tx: TenantTx): Promise<ActionPreview> {
    const plan = await ownPlan(tx, i.plan_id, actorUserId(ctx));
    return preview('write', line(plan.fileName, plan.entity), {
      changes: [
        {
          entity: 'transfer_plan',
          id: plan.id,
          before: { status: plan.status },
          after: { status: plan.status === 'committing' ? 'cancelling' : 'cancelled' },
        },
      ],
      ...(plan.status === 'committing' ? { warnings: ['partial_kept'] } : {}),
    });
  }

  async execute(
    ctx: ActionContext,
    i: CancelIn,
    tx: TenantTx,
  ): Promise<HandlerOutcome<{ plan_id: string; status: string }>> {
    const plan = await ownPlan(tx, i.plan_id, actorUserId(ctx), true);
    const now = this.d.now();
    if (plan.status === 'cancelled') return { result: { plan_id: plan.id, status: 'cancelled' } };
    if (plan.status === 'draft') {
      await tx.transferPlan.update({
        where: { id: plan.id },
        data: { status: 'cancelled', finishedAt: now, updatedAt: now },
      });
      return { result: { plan_id: plan.id, status: 'cancelled' }, before: { status: 'draft' } };
    }
    if (plan.status !== 'committing' || !plan.jobId)
      throw new AppError('INVALID_STATE', 409, { status: plan.status });
    // Đang ghi nền: huỷ hợp tác ở ranh giới lô (runner thấy `cancelling` của data_job).
    await tx.dataJob.updateMany({
      where: { id: plan.jobId, status: { in: ['queued', 'running'] } },
      data: { status: 'cancelling', updatedAt: now },
    });
    return {
      result: { plan_id: plan.id, status: 'cancelling' },
      before: { status: plan.status },
      events: [{ topic: 'data_job.requested', payload: { job_id: plan.jobId, kind: TRANSFER_COMMIT_KIND } }],
    };
  }
}
