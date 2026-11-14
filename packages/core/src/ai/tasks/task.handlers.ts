// ai_task.create · update · pause · delete · run_now (Blueprint §3.4 ai, §5.4; REQ-E13). Người tạo = người ra lệnh của mọi lần chạy
// (quyền hiệu lực = agent ∩ người này, kiểm lại mỗi lần gọi tool — §3.3b). Chạy ngay / run_now: tạo run `queued` + ý định đẩy (TIP-006b)
// cùng transaction, đẩy queue `ai-task` SAU commit (worker ROLE=ai chạy). Hoàn tác: tạo → xoá mềm; sửa / tạm dừng / xoá → đặt lại ảnh chụp trước.
import { Inject, Injectable, Optional } from '@nestjs/common';
import type { ActionInput, aiTaskCreate, aiTaskDelete, aiTaskPause, aiTaskRunNow, aiTaskUpdate } from '@appchat/actions';
import { AI_TASK_TEMPLATE_DEFS, AppError } from '@appchat/shared';
import { QuotaService } from '../../billing/public';
import { CLOCK, type Clock } from '../../kernel/clock';
import { uuidv7 } from '../../kernel/ids';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import { TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import { admitRun, LIVE_RUN, lockTask } from './occurrence';
import { pushIntent } from './dispatch-intent';
import { TaskPlace } from './task-place';
import { TASK_QUEUE, type TaskQueue } from './task.queue';
import { assertTier, liveTask, nextRunOf, resolveAgent, restoreData, snapOf, triggerCols, type TaskSnap } from './task.store';
import { createPreview, deletePreview, pausePreview, runNowPreview, updatePreview } from './previews/task.handlers.preview';

type CreateIn = ActionInput<typeof aiTaskCreate>;

/** Tạo run `queued` + ý định đẩy cùng transaction (TIP-006b §5.2 — màn "đang điều phối" thấy ngay; mất job → quét đẩy lại). */
export const queueRun = (tx: TenantTx, now: () => Date, t: { id: string; name: string; modelTier: string; agentId: string | null; createdByUserId: string; creditLimitPerRun: number }, source: string) =>
  admitRun(tx, now, t, { source });

/** Sau commit: đẩy job theo ý định (claim + thế hệ). Lỗi đẩy / thiếu Redis → ý định còn pending, quét ROLE=ai đẩy lại. */
const pushAfter = (queue: TaskQueue | null, tenants: Pick<TenantDbResolver, 'get'> | null, ws: string, runId: string, now: () => Date) => async () => {
  if (!queue || !tenants) return;
  await pushIntent(await tenants.get(TenantContexts.system(ws, 'ai-task')), queue, ws, runId, now()).catch(() => undefined);
};

/** Đổi cách chạy / lịch / sự kiện / trạng thái → thế hệ trigger mới (lần xảy ra của thế hệ cũ không áp vào tác vụ đã đổi). */
const bumpGen = { triggerGeneration: { increment: 1 } } as const;

/** Sau commit: tác vụ theo lịch đang bật → đánh dấu workspace cho job lịch (task-scheduler `ArmedSet`). */
const armAfter = (queue: TaskQueue | null, ws: string, t: { trigger: string; status: string }) => async () => {
  if (t.trigger === 'schedule' && t.status === 'active') await queue?.arm(ws);
};

@Injectable()
@ActionHandler('ai_task.create')
export class AiTaskCreateHandler implements Handler<CreateIn, { task_id: string; run_id?: string }> {
  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(TaskPlace) private readonly place: TaskPlace,
    @Optional() @Inject(QuotaService) private readonly quota: QuotaService | null,
    @Optional() @Inject(TASK_QUEUE) private readonly queue: TaskQueue | null,
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver | null,
  ) {}

  async execute(ctx: ActionContext, i: CreateIn, tx: TenantTx): Promise<HandlerOutcome<{ task_id: string; run_id?: string }>> {
    const now = this.clock.now();
    assertTier(i.model_tier, this.quota ? (await this.quota.limits(ctx.workspaceId)).planKey : null);
    const tpl = i.template ? AI_TASK_TEMPLATE_DEFS[i.template] : null;
    const agentId = await resolveAgent(tx, i.agent_id, i.template);
    const trig = triggerCols(i.trigger, i.cron ?? (i.trigger === 'schedule' ? tpl?.cron : undefined), i.event_type);
    const place = await this.place.of(ctx.workspaceId);
    const owner = ctx.onBehalfOfUserId ?? ctx.authz.userId;
    const base = { id: uuidv7(now.getTime()), trigger: i.trigger, ...trig, status: 'active' as const };
    const t = await tx.aiTask.create({
      data: {
        ...base,
        name: i.name,
        goal: i.goal,
        department: i.department ?? tpl?.department ?? 'Vận hành',
        agentId,
        template: i.template ?? null,
        params: { ...(tpl?.params ?? {}), ...(i.params ?? {}) },
        dataScope: i.data_scope ?? tpl?.data ?? [],
        toolIds: i.tools ?? tpl?.tools ?? ['read', 'report'],
        modelTier: i.model_tier,
        askBeforeSend: i.ask_before_send,
        creditLimitPerRun: i.credit_limit_per_run,
        createdByUserId: owner,
        nextRunAt: nextRunOf(base, now, place.timeZone),
        createdAt: now,
        updatedAt: now,
      },
    });
    const runId = i.trigger === 'manual' ? await queueRun(tx, () => now, t, 'manual') : undefined;
    return {
      result: { task_id: t.id, ...(runId ? { run_id: runId } : {}) },
      after: snapOf(t),
      afterCommit: runId ? pushAfter(this.queue, this.tenants, ctx.workspaceId, runId, () => this.clock.now()) : armAfter(this.queue, ctx.workspaceId, t),
    };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const { task_id } = log.result as { task_id: string };
    await tx.aiTask.updateMany({ where: { id: task_id, deletedAt: null }, data: { deletedAt: this.clock.now(), status: 'paused', nextRunAt: null } });
  }

  async preview(ctx: ActionContext, i: CreateIn, tx: TenantTx) {
    return createPreview(tx, i, this.quota ? (await this.quota.limits(ctx.workspaceId)).planKey : null);
  }
}

/** Đặt lại ảnh chụp trước (sửa / tạm dừng / xoá); lịch tính lại theo giờ hiện tại. */
abstract class RestoreUndo {
  constructor(
    protected readonly clock: Clock,
    protected readonly place: TaskPlace,
    protected readonly queue: TaskQueue | null,
  ) {}

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const s = log.before as TaskSnap;
    const data = restoreData(s);
    const tz = (await this.place.of(ctx.workspaceId)).timeZone;
    await tx.aiTask.update({ where: { id: s.id }, data: { ...data, nextRunAt: nextRunOf(data, this.clock.now(), tz), updatedAt: this.clock.now(), version: { increment: 1 }, ...bumpGen } });
    // Đánh dấu thừa vô hại (job lịch gỡ khi không còn tác vụ lịch) — hoàn tác không có afterCommit.
    await armAfter(this.queue, ctx.workspaceId, data as { trigger: string; status: string })();
  }
}

@Injectable()
@ActionHandler('ai_task.update')
export class AiTaskUpdateHandler extends RestoreUndo implements Handler<ActionInput<typeof aiTaskUpdate>, { task_id: string }> {
  constructor(
    @Inject(CLOCK) clock: Clock,
    @Inject(TaskPlace) place: TaskPlace,
    @Optional() @Inject(QuotaService) private readonly quota: QuotaService | null,
    @Optional() @Inject(TASK_QUEUE) queue: TaskQueue | null,
  ) {
    super(clock, place, queue);
  }

  async execute(ctx: ActionContext, i: ActionInput<typeof aiTaskUpdate>, tx: TenantTx): Promise<HandlerOutcome<{ task_id: string }>> {
    const t = await liveTask(tx, i.task_id, ctx.authz);
    const p = i.patch;
    assertTier(p.model_tier, this.quota ? (await this.quota.limits(ctx.workspaceId)).planKey : null);
    const agentId = p.agent_id !== undefined ? await resolveAgent(tx, p.agent_id, p.template ?? t.template) : t.agentId;
    const trigger = p.trigger ?? t.trigger;
    const trig = p.trigger || p.cron !== undefined || p.event_type !== undefined ? triggerCols(trigger, p.cron ?? t.cron, p.event_type ?? t.eventType) : { cron: t.cron, eventType: t.eventType };
    const now = this.clock.now();
    const tz = (await this.place.of(ctx.workspaceId)).timeZone;
    const next = { trigger, ...trig, status: t.status };
    const u = await tx.aiTask.update({
      where: { id: t.id },
      data: {
        ...(p.name !== undefined ? { name: p.name } : {}),
        ...(p.goal !== undefined ? { goal: p.goal } : {}),
        ...(p.prompt !== undefined ? { prompt: p.prompt } : {}),
        ...(p.department !== undefined ? { department: p.department } : {}),
        ...(p.template !== undefined ? { template: p.template } : {}),
        ...(p.params !== undefined ? { params: p.params } : {}),
        ...(p.data_scope !== undefined ? { dataScope: p.data_scope } : {}),
        ...(p.tools !== undefined ? { toolIds: p.tools } : {}),
        ...(p.model_tier !== undefined ? { modelTier: p.model_tier } : {}),
        ...(p.ask_before_send !== undefined ? { askBeforeSend: p.ask_before_send } : {}),
        ...(p.credit_limit_per_run !== undefined ? { creditLimitPerRun: p.credit_limit_per_run } : {}),
        agentId,
        ...next,
        nextRunAt: nextRunOf(next, now, tz),
        updatedAt: now,
        version: { increment: 1 },
        ...(next.trigger !== t.trigger || next.cron !== t.cron || next.eventType !== t.eventType ? bumpGen : {}),
      },
    });
    return { result: { task_id: t.id }, before: snapOf(t), after: snapOf(u), afterCommit: armAfter(this.queue, ctx.workspaceId, u) };
  }

  async preview(ctx: ActionContext, i: ActionInput<typeof aiTaskUpdate>, tx: TenantTx) {
    return updatePreview(ctx, tx, i, this.quota ? (await this.quota.limits(ctx.workspaceId)).planKey : null);
  }
}

@Injectable()
@ActionHandler('ai_task.pause')
export class AiTaskPauseHandler extends RestoreUndo implements Handler<ActionInput<typeof aiTaskPause>, { task_id: string; active: boolean }> {
  constructor(@Inject(CLOCK) clock: Clock, @Inject(TaskPlace) place: TaskPlace, @Optional() @Inject(TASK_QUEUE) queue: TaskQueue | null) {
    super(clock, place, queue);
  }

  async execute(ctx: ActionContext, i: ActionInput<typeof aiTaskPause>, tx: TenantTx): Promise<HandlerOutcome<{ task_id: string; active: boolean }>> {
    const t = await liveTask(tx, i.task_id, ctx.authz);
    const status = i.paused ? 'paused' : 'active';
    if (t.status === status) return { result: { task_id: t.id, active: status === 'active' } };
    const now = this.clock.now();
    const tz = (await this.place.of(ctx.workspaceId)).timeZone;
    const u = await tx.aiTask.update({ where: { id: t.id }, data: { status, nextRunAt: nextRunOf({ ...t, status }, now, tz), updatedAt: now, version: { increment: 1 }, ...bumpGen } });
    return { result: { task_id: t.id, active: status === 'active' }, before: snapOf(t), after: snapOf(u), afterCommit: armAfter(this.queue, ctx.workspaceId, u) };
  }

  async preview(ctx: ActionContext, i: ActionInput<typeof aiTaskPause>, tx: TenantTx) {
    return pausePreview(ctx, tx, i);
  }
}

@Injectable()
@ActionHandler('ai_task.delete')
export class AiTaskDeleteHandler extends RestoreUndo implements Handler<ActionInput<typeof aiTaskDelete>, { task_id: string }> {
  constructor(@Inject(CLOCK) clock: Clock, @Inject(TaskPlace) place: TaskPlace, @Optional() @Inject(TASK_QUEUE) queue: TaskQueue | null) {
    super(clock, place, queue);
  }

  async execute(ctx: ActionContext, i: ActionInput<typeof aiTaskDelete>, tx: TenantTx): Promise<HandlerOutcome<{ task_id: string }>> {
    const t = await liveTask(tx, i.task_id, ctx.authz);
    const now = this.clock.now();
    await tx.aiTask.update({ where: { id: t.id }, data: { deletedAt: now, nextRunAt: null, updatedAt: now, version: { increment: 1 }, ...bumpGen } });
    return { result: { task_id: t.id }, before: snapOf(t) };
  }

  async preview(ctx: ActionContext, i: ActionInput<typeof aiTaskDelete>, tx: TenantTx) {
    return deletePreview(ctx, tx, i);
  }
}

@Injectable()
@ActionHandler('ai_task.run_now')
export class AiTaskRunNowHandler implements Handler<ActionInput<typeof aiTaskRunNow>, { task_id: string; run_id: string }> {
  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    @Optional() @Inject(TASK_QUEUE) private readonly queue: TaskQueue | null,
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver | null,
  ) {}

  async execute(ctx: ActionContext, i: ActionInput<typeof aiTaskRunNow>, tx: TenantTx): Promise<HandlerOutcome<{ task_id: string; run_id: string }>> {
    const t = await liveTask(tx, i.task_id, ctx.authz);
    // Tạm dừng chỉ chặn lịch / sự kiện; chạy tay vẫn được (người dùng chủ động). TIP-006b §5.2: cùng khoá dòng tác vụ với lịch / sự kiện,
    // đang có lượt chưa kết thúc (mọi trạng thái sống của 019b, gồm chờ duyệt / provider) → 409, không chồng lượt.
    await lockTask(tx, t.id);
    if (await tx.aiRun.count({ where: { taskId: t.id, status: { in: [...LIVE_RUN] } } })) throw new AppError('CONFLICT', 409, { task_id: 'running' });
    const runId = await queueRun(tx, () => this.clock.now(), t, 'manual');
    return { result: { task_id: t.id, run_id: runId }, afterCommit: pushAfter(this.queue, this.tenants, ctx.workspaceId, runId, () => this.clock.now()) };
  }

  async preview(ctx: ActionContext, i: ActionInput<typeof aiTaskRunNow>, tx: TenantTx) {
    return runNowPreview(ctx, tx, i);
  }
}
