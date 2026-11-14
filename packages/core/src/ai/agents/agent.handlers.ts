// Action `agent.*` ghi cấu hình (Blueprint §3.4, §5.3b, state-machine ai_agent; D29): tạo bản nháp / tạo + xuất bản (undo 24h =
// tạm dừng + xoá mềm), sửa bản nháp (undo 24h), xuất bản (snapshot → phiên bản mới), quay lại (xuất bản lại snapshot cũ), tạm
// dừng / chạy, xoá mềm (undo 30 ngày; đang phụ trách kênh / hội thoại mở → HAS_DEPENDENCIES — D52). Hạn mức `plan.max_agents`.
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, agentCreate, agentDelete, agentPause, agentPublish, agentRollback, agentUpdate } from '@appchat/actions';
import { QuotaService } from '../../billing/public';
import { openReservations, reserveQuota } from '../../kernel/consistency/handler-adapter';
import { CLOCK, type Clock } from '../../kernel/clock';
import { uuidv7 } from '../../kernel/ids';
import { assertIfVersion } from '../../kernel/actions/cas';
import type { ActionContext, PlatformTx, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { agentEvent, assertTools, blankConfig, columnsOf, configOf, countLive, liveAgent, merge, publishDraft, type AgentConfig, type AgentRow } from './agent.store';
import { createAndPublishPreview, createPreview, deletePreview, pausePreview, publishPreview, rollbackPreview, updatePreview } from './previews/agent.handlers.preview';

type Cfg = ActionInput<typeof agentCreate>;
const userOf = (ctx: ActionContext) => ctx.onBehalfOfUserId ?? (ctx.actor.type === 'user' ? ctx.actor.id : null);
const CREATED_VIA = { ui: 'manual', api: 'manual', system: 'manual', assistant: 'assistant', agent: 'assistant', task: 'assistant' } as const;

/**
 * Pha nền tảng (TIP-045b): khoá workspace + kiểm hạn mức gói (agent đang có + chỗ đang giữ) + giữ chỗ, kiểm tool — tenant chỉ đọc.
 * Tạo dòng `ai_agent` ở pha tenant (`applyTenant`) với id tất định sinh ở đây.
 */
async function reserveAgent(ctx: ActionContext, input: Cfg, tx: TenantTx, ptx: PlatformTx | undefined, now: Date) {
  if (!ptx) throw new AppError('INTERNAL', 500, undefined, 'agent.create cần PlatformTx');
  await ptx.$queryRaw`SELECT id FROM workspace WHERE id = ${ctx.workspaceId}::uuid FOR UPDATE`;
  await new QuotaService(ptx, () => now).assert(ctx.workspaceId, 'agents', (await countLive(tx)) + (await openReservations(ptx, ctx.workspaceId, 'agents')));
  await reserveQuota(ptx, ctx, 'agents', now);
  const cfg = merge(blankConfig(), input as Partial<AgentConfig>);
  assertTools(cfg.tools, ctx.authz);
  const via = cfg.template_id ? 'template' : CREATED_VIA[ctx.source];
  return { id: uuidv7(now.getTime()), cfg, via, by: userOf(ctx), at: now.toISOString() };
}

type AgentPlan = Awaited<ReturnType<typeof reserveAgent>>;

/** Pha tenant: tạo bản nháp (id tất định — áp lại thấy đã có thì dùng lại). */
async function insertAgent(tx: TenantTx, p: AgentPlan): Promise<AgentRow> {
  const found = await tx.aiAgent.findUnique({ where: { id: p.id } });
  if (found) return found;
  const at = new Date(p.at);
  return tx.aiAgent.create({ data: { id: p.id, ...columnsOf(p.cfg), createdVia: p.via as 'manual', createdBy: p.by, draftDirty: true, createdAt: at, updatedAt: at } });
}

@Injectable()
@ActionHandler('agent.create')
export class AgentCreateHandler implements Handler<Cfg, { agent_id: string }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: Cfg, tx: TenantTx, ptx?: PlatformTx): Promise<HandlerOutcome<{ agent_id: string }>> {
    const p = await reserveAgent(ctx, input, tx, ptx, this.clock.now());
    return { result: { agent_id: p.id }, after: { id: p.id }, tenantPlan: { ...p } };
  }

  async applyTenant(_ctx: ActionContext, plan: Record<string, unknown>, tx: TenantTx) {
    const a = await insertAgent(tx, plan as unknown as AgentPlan);
    return { result: { agent_id: a.id } };
  }

  async preview(ctx: ActionContext, input: Cfg) {
    return createPreview(ctx, input);
  }
}

@Injectable()
@ActionHandler('agent.create_and_publish')
export class AgentCreateAndPublishHandler implements Handler<Cfg, { agent_id: string; version: number }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: Cfg, tx: TenantTx, ptx?: PlatformTx): Promise<HandlerOutcome<{ agent_id: string; version: number }>> {
    const p = await reserveAgent(ctx, input, tx, ptx, this.clock.now());
    return { result: { agent_id: p.id, version: 1 }, after: { id: p.id }, tenantPlan: { ...p } };
  }

  async applyTenant(_ctx: ActionContext, plan: Record<string, unknown>, tx: TenantTx) {
    const p = plan as unknown as AgentPlan;
    const a = await insertAgent(tx, p);
    const { version } = a.publishedVersion > 0 ? { version: a.publishedVersion } : await publishDraft(tx, a, p.by, '', new Date(p.at));
    return { result: { agent_id: a.id, version }, events: [{ topic: 'agent.published', payload: agentEvent(a, version, 'active') }] };
  }

  async preview(ctx: ActionContext, input: Cfg) {
    return createAndPublishPreview(ctx, input);
  }

  /** Hoàn tác = tạm dừng + xoá mềm (Blueprint §3.4) — lịch sử run giữ nguyên. */
  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const { id } = log.after as { id: string };
    await tx.aiAgent.updateMany({ where: { id, deletedAt: null }, data: { status: 'paused', deletedAt: this.clock.now() } });
  }
}

@Injectable()
@ActionHandler('agent.update')
export class AgentUpdateHandler implements Handler<ActionInput<typeof agentUpdate>, { agent_id: string }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof agentUpdate>, tx: TenantTx): Promise<HandlerOutcome<{ agent_id: string }>> {
    // TIP-003e: khoá dòng rồi đọc lại, so `row_version` (trigger tăng mỗi UPDATE) — hai người sửa cùng bản nháp → người sau 409.
    await liveAgent(tx, input.agent_id);
    await tx.$queryRaw`SELECT 1 FROM ai_agent WHERE id = ${input.agent_id}::uuid FOR UPDATE`;
    const a = await liveAgent(tx, input.agent_id);
    assertIfVersion(a.rowVersion, input.if_version);
    const before = configOf(a);
    const next = merge(before, input.patch as Partial<AgentConfig>);
    // Chỉ kiểm tool mới thêm (tool cũ do người khác cấp vẫn giữ — người sửa không cần có mọi quyền cũ).
    assertTools(next.tools.filter((t) => !before.tools.includes(t)), ctx.authz);
    await tx.aiAgent.update({ where: { id: a.id }, data: { ...columnsOf(next), draftDirty: true, updatedAt: this.clock.now() } });
    return { result: { agent_id: a.id }, before: { id: a.id, config: before, dirty: a.draftDirty }, after: { id: a.id } };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const b = log.before as { id: string; config: AgentConfig; dirty: boolean };
    await tx.aiAgent.updateMany({ where: { id: b.id, deletedAt: null }, data: { ...columnsOf(b.config), draftDirty: b.dirty } });
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof agentUpdate>, tx: TenantTx) {
    return updatePreview(ctx, tx, input);
  }
}

@Injectable()
@ActionHandler('agent.publish')
export class AgentPublishHandler implements Handler<ActionInput<typeof agentPublish>, { agent_id: string; version: number }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof agentPublish>, tx: TenantTx): Promise<HandlerOutcome<{ agent_id: string; version: number }>> {
    const a = await liveAgent(tx, input.agent_id);
    const { version } = await publishDraft(tx, a, userOf(ctx), input.note?.trim() ?? '', this.clock.now());
    return { result: { agent_id: a.id, version }, after: { id: a.id, version }, events: [{ topic: 'agent.published', payload: agentEvent(a, version, 'active') }] };
  }

  async preview(_ctx: ActionContext, input: ActionInput<typeof agentPublish>, tx: TenantTx) {
    return publishPreview(tx, input);
  }
}

@Injectable()
@ActionHandler('agent.rollback')
export class AgentRollbackHandler implements Handler<ActionInput<typeof agentRollback>, { agent_id: string; version: number }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof agentRollback>, tx: TenantTx): Promise<HandlerOutcome<{ agent_id: string; version: number }>> {
    const a = await liveAgent(tx, input.agent_id);
    const v = await tx.aiAgentVersion.findUnique({ where: { agentId_version: { agentId: a.id, version: input.version } } });
    if (!v) throw new AppError('NOT_FOUND', 404, { version: 'not_found' });
    const cfg = merge(blankConfig(), v.config as Partial<AgentConfig>);
    const { version } = await publishDraft(tx, a, userOf(ctx), `↩ v${input.version}`, this.clock.now(), cfg, true);
    return { result: { agent_id: a.id, version }, after: { id: a.id, version, from: input.version }, events: [{ topic: 'agent.published', payload: agentEvent(a, version, 'active') }] };
  }

  async preview(_ctx: ActionContext, input: ActionInput<typeof agentRollback>, tx: TenantTx) {
    return rollbackPreview(tx, input);
  }
}

@Injectable()
@ActionHandler('agent.pause')
export class AgentPauseHandler implements Handler<ActionInput<typeof agentPause>, { agent_id: string; status: string }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(_ctx: ActionContext, input: ActionInput<typeof agentPause>, tx: TenantTx): Promise<HandlerOutcome<{ agent_id: string; status: string }>> {
    const a = await liveAgent(tx, input.agent_id);
    // Bản nháp chưa xuất bản không chạy → không có gì để tạm dừng / chạy (state-machine: draft chỉ đi tới active qua publish).
    if (a.publishedVersion === 0) throw new AppError('INVALID_TRANSITION', 409, { status: a.status });
    const status = input.paused ? 'paused' : 'active';
    if (a.status === status) return { result: { agent_id: a.id, status } };
    await tx.aiAgent.update({ where: { id: a.id }, data: { status, updatedAt: this.clock.now() } });
    const events = input.paused ? [{ topic: 'agent.paused', payload: agentEvent(a, a.publishedVersion, 'paused') }] : [{ topic: 'agent.published', payload: agentEvent(a, a.publishedVersion, 'active') }];
    return { result: { agent_id: a.id, status }, before: { id: a.id, status: a.status }, after: { id: a.id, status }, events };
  }

  async preview(_ctx: ActionContext, input: ActionInput<typeof agentPause>, tx: TenantTx) {
    return pausePreview(tx, input);
  }
}

@Injectable()
@ActionHandler('agent.delete')
export class AgentDeleteHandler implements Handler<ActionInput<typeof agentDelete>, { agent_id: string }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(_ctx: ActionContext, input: ActionInput<typeof agentDelete>, tx: TenantTx): Promise<HandlerOutcome<{ agent_id: string }>> {
    const a = await liveAgent(tx, input.agent_id);
    await assertNoDependencies(tx, a.id);
    await tx.aiAgent.update({ where: { id: a.id }, data: { deletedAt: this.clock.now(), updatedAt: this.clock.now() } });
    return { result: { agent_id: a.id }, before: { id: a.id }, events: [{ topic: 'agent.deleted', payload: agentEvent(a, a.publishedVersion, 'deleted') }] };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const { id } = log.before as { id: string };
    await tx.aiAgent.updateMany({ where: { id }, data: { deletedAt: null } });
  }

  async preview(_ctx: ActionContext, input: ActionInput<typeof agentDelete>, tx: TenantTx) {
    return deletePreview(tx, input, assertNoDependencies);
  }
}

/** Chặn xoá agent đang phụ trách tài khoản kênh / hội thoại chưa đóng (D52) → 409 kèm danh sách. */
async function assertNoDependencies(tx: TenantTx, id: string) {
  const [accounts, convs] = await Promise.all([
    tx.$queryRaw<{ id: string; name: string }[]>`SELECT id::text, name FROM channel_account WHERE status <> 'disconnected' AND settings->>'agent_id' = ${id} LIMIT 10`,
    tx.conversation.count({ where: { assigneeAgentId: id, status: { not: 'closed' } } }),
  ]);
  if (accounts.length || convs) throw new AppError('HAS_DEPENDENCIES', 409, { channel_accounts: accounts.map((x) => x.name).join(', '), conversations: String(convs) });
}
