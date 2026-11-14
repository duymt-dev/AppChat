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
  type TransferTarget,
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
import { atomicPlan, commitBlocker, requireImport } from '../services/plan-view';
import { categoryCommitPreview } from '../adapters/ticket-categories';
import { assertDataset, planTarget } from '../services/dataset';
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
  // Tập + lược đồ cố định của kế hoạch: gửi kèm tập khác → 409; lược đồ đổi sau khi lập → 409 lập lại (không chạy luật mới trên ánh xạ cũ).
  assertDataset(plan, i.dataset);
  requireImport(ctx.authz, planTarget(plan));
  const block = commitBlocker(plan, now);
  // Thông điệp chỉ đường cho Trợ lý / API: còn dòng lỗi với `all_valid` → đổi chính sách (KHÔNG lập kế hoạch mới — kế hoạch mới vẫn lỗi).
  if (block)
    throw new AppError('INVALID_STATE', 409, block, block.rows === 'has_invalid' && !atomicPlan(plan) ? `${plan.invalid} invalid rows: call transfer.update_mapping {plan_id, if_version, row_policy:"only_valid"} to skip them (user choice), then transfer.commit with the new version` : undefined);
  return plan;
}

/** Số bản ghi sẽ tạo: khách / sản phẩm = số dòng; báo giá / đơn = số nhóm hợp lệ; hợp đồng / đề nghị = số dòng. */
async function unitCount(tx: TenantTx, plan: { id: string; entity: string; dataset: string; datasetSchemaVersion: number; valid: number }) {
  if (!transferSpec(planTarget(plan) as TransferTarget).grouped) return plan.valid;
  const r = await tx.$queryRaw<
    { n: bigint }[]
  >`SELECT count(DISTINCT group_key) AS n FROM transfer_row WHERE plan_id = ${plan.id}::uuid AND "check" = 'valid'`;
  return Number(r[0]?.n ?? 0);
}

/** Chạy nền: khách > 500 dòng (lô contact.import); chứng từ / hoạt động CRM > 50 (mỗi bản ghi một action). Tập ghi cả tệp một lệnh (sản
 *  phẩm qua product.import — tự chạy nền > 500; danh mục ticket ≤ 100 nhãn) luôn chạy ngay. */
const runsAsJob = (plan: { entity: string; dataset: string; valid: number }, docs: number) =>
  plan.entity === 'contact' && plan.dataset === 'base'
    ? plan.valid > TRANSFER_SYNC_ROWS
    : !atomicPlan(plan) && docs > TRANSFER_SYNC_DOCS;

/** Danh mục ticket (TIP-034b §4.3): thẻ xác nhận là thay CẢ bộ cấu hình (risk config, trước / sau đầy đủ); cấu hình đổi sau khi lập → 409. */
const isCategories = (plan: { entity: string }) => plan.entity === 'ticket_category_suggestions';

@Injectable()
@ActionHandler('transfer.commit')
export class TransferCommitHandler implements Handler<CommitIn, CommitOut> {
  constructor(@Inject(TransferDeps) private readonly d: TransferDeps) {}

  async preview(ctx: ActionContext, i: CommitIn, tx: TenantTx): Promise<ActionPreview> {
    const plan = await draftPlan(tx, ctx, i, this.d.now());
    if (isCategories(plan)) return preview('config', line(plan.fileName, `${plan.valid}`), await categoryCommitPreview(tx, plan.id));
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
        entity: plan.dataset === 'base' ? plan.entity : plan.dataset,
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
    // Cấu hình đã đổi (tay / Trợ lý) sau khi lập kế hoạch → 409 ngay, không tự áp lên bản mới.
    if (isCategories(plan)) await categoryCommitPreview(tx, plan.id);
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
      dataset: plan.dataset,
      dataset_schema_version: plan.datasetSchemaVersion,
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
        input: { plan_id: plan.id, version: plan.version, dataset: plan.dataset },
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
