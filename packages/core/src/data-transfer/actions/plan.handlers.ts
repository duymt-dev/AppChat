// transfer.plan · transfer.update_mapping (TIP-038b, DC-374): đọc + kiểm tệp NGOÀI transaction (`prepare`), ghi kế hoạch + dòng trong
// transaction executor. Không ghi dữ liệu nghiệp vụ. Quyền nhập của thực thể kiểm trên người gọi hiện tại. Đổi ánh xạ = đọc lại CÙNG tệp
// (checksum phải khớp), kiểm lại toàn bộ, tăng version (thẻ xác nhận commit cũ không còn khớp input).
import { Inject, Injectable } from '@nestjs/common';
import { AppError, type TransferPlanDto, type TransferTarget } from '@appchat/shared';
import type { ActionInput, ActionPreview, transferPlan, transferUpdateMapping } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import {
  ActionHandler,
  type ActionHandler as Handler,
  type HandlerOutcome,
} from '../../kernel/actions/handler';
import { line, preview } from '../../kernel/actions/preview-kit';
import { actorUserId } from '../../crm/public';
import { TransferDeps } from '../data-transfer.providers';
import { classify, createPlan, markReimported, ownPlan, preparePlan, replanRows } from '../services/planner';
import { planView, requireImport } from '../services/plan-view';
import { assertDataset, planTarget, resolveTarget } from '../services/dataset';

type PlanIn = ActionInput<typeof transferPlan>;
type MapIn = ActionInput<typeof transferUpdateMapping>;
type Prepared = Awaited<ReturnType<typeof preparePlan>> & { target: TransferTarget };

const me = (ctx: ActionContext) => {
  const id = actorUserId(ctx);
  if (!id) throw new AppError('FORBIDDEN', 403, { actor: 'user_required' });
  return id;
};

@Injectable()
@ActionHandler('transfer.plan')
export class TransferPlanHandler implements Handler<PlanIn, TransferPlanDto> {
  constructor(@Inject(TransferDeps) private readonly d: TransferDeps) {}

  /** Kế hoạch chỉ ghi bản xem trước (không ghi dữ liệu nghiệp vụ) — thẻ nêu tệp + thực thể. */
  async preview(_ctx: ActionContext, i: PlanIn, tx: TenantTx): Promise<ActionPreview> {
    const f = await tx.file.findUnique({ where: { id: i.file_id }, select: { name: true } });
    const dataset = i.dataset ?? 'base';
    return preview('write', line(f?.name, i.entity, dataset === 'base' ? null : dataset, i.sheet), {
      changes: [{ entity: 'transfer_plan', after: { entity: i.entity, dataset, file: f?.name ?? i.file_id } }],
    });
  }

  async prepare(ctx: ActionContext, i: PlanIn): Promise<Prepared> {
    const target = resolveTarget(i.entity, i.dataset);
    requireImport(ctx.authz, target);
    const db = await this.d.db(ctx.workspaceId, 'transfer.plan');
    const p = await preparePlan(db, this.d.files(), {
      userId: me(ctx),
      entity: target,
      fileId: i.file_id,
      sheet: i.sheet,
      mapping: i.mapping,
      now: this.d.now(),
    });
    return { ...p, target };
  }

  async execute(
    ctx: ActionContext,
    i: PlanIn,
    tx: TenantTx,
    _ptx?: unknown,
    prepared?: unknown,
  ): Promise<HandlerOutcome<TransferPlanDto>> {
    const p = prepared as Prepared;
    const now = this.d.now();
    const rows = await markReimported(
      tx,
      p.target,
      me(ctx),
      p.file,
      p.table.sheet,
      await classify(tx, p.target, { userId: me(ctx), authz: ctx.authz }, p.checked),
    );
    const id = await createPlan(
      tx,
      { userId: me(ctx), entity: p.target, aiRunId: ctx.runId ?? null, now },
      { ...p, rows },
    );
    const plan = await tx.transferPlan.findUniqueOrThrow({ where: { id } });
    // Tệp đã dùng cho kế hoạch → xác nhận (không bị dọn như tệp tải lên bỏ dở), vẫn chỉ người tải đọc được.
    await tx.file.updateMany({ where: { id: p.file.id }, data: { confirmed: true } });
    return {
      result: planView(plan, p.table.columns),
      after: {
        plan_id: id,
        entity: i.entity,
        dataset: plan.dataset,
        dataset_schema_version: plan.datasetSchemaVersion,
        file_sha256: p.file.sha256,
        total: plan.total,
        valid: plan.valid,
        invalid: plan.invalid,
      },
    };
  }
}

@Injectable()
@ActionHandler('transfer.update_mapping')
export class TransferUpdateMappingHandler implements Handler<MapIn, TransferPlanDto> {
  constructor(@Inject(TransferDeps) private readonly d: TransferDeps) {}

  async preview(ctx: ActionContext, i: MapIn, tx: TenantTx): Promise<ActionPreview> {
    const plan = await ownPlan(tx, i.plan_id, actorUserId(ctx));
    const after = {
      ...(i.mapping ? { mapping: i.mapping } : {}),
      ...(i.row_policy ? { row_policy: i.row_policy } : {}),
    };
    return preview('write', line(plan.fileName, plan.entity), {
      changes: [
        {
          entity: 'transfer_plan',
          id: plan.id,
          before: { mapping: plan.mapping as Record<string, string>, row_policy: plan.rowPolicy },
          after,
        },
      ],
    });
  }

  async prepare(ctx: ActionContext, i: MapIn): Promise<Prepared> {
    const db = await this.d.db(ctx.workspaceId, 'transfer.update_mapping');
    const plan = await ownPlan(db, i.plan_id, actorUserId(ctx));
    if (plan.status !== 'draft') throw new AppError('INVALID_STATE', 409, { status: plan.status });
    if (plan.version !== i.if_version)
      throw new AppError('CONFLICT', 409, { if_version: 'stale', version: String(plan.version) });
    // Tập cố định của kế hoạch (không theo lựa chọn UI sau cùng); gửi kèm dataset khác → 409, lược đồ đổi → 409 lập lại.
    assertDataset(plan, i.dataset);
    const entity = planTarget(plan);
    requireImport(ctx.authz, entity);
    const mapping = i.mapping ?? (plan.mapping as Record<string, string>);
    const p = await preparePlan(db, this.d.files(), {
      userId: me(ctx),
      entity,
      fileId: plan.fileId,
      sheet: plan.sheet,
      mapping,
      expectSha: plan.fileSha256,
      now: this.d.now(),
    });
    return { ...p, target: entity };
  }

  async execute(
    ctx: ActionContext,
    i: MapIn,
    tx: TenantTx,
    _ptx?: unknown,
    prepared?: unknown,
  ): Promise<HandlerOutcome<TransferPlanDto>> {
    const p = prepared as Prepared;
    const now = this.d.now();
    await ownPlan(tx, i.plan_id, actorUserId(ctx), true);
    const rows = await markReimported(
      tx,
      p.target,
      me(ctx),
      p.file,
      p.table.sheet,
      await classify(tx, p.target, { userId: me(ctx), authz: ctx.authz }, p.checked),
    );
    await replanRows(
      tx,
      i.plan_id,
      i.if_version,
      { mapping: p.mapping, rowPolicy: i.row_policy },
      { ...p, rows },
      now,
    );
    const plan = await tx.transferPlan.findUniqueOrThrow({ where: { id: i.plan_id } });
    return {
      result: planView(plan, p.table.columns),
      before: { version: i.if_version },
      after: { version: plan.version, valid: plan.valid, invalid: plan.invalid, row_policy: plan.rowPolicy },
    };
  }
}
