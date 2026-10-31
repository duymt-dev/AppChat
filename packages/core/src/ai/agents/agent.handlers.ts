// Action `agent.*` ghi cấu hình (Blueprint §3.4, §5.3b, state-machine ai_agent; D29): tạo bản nháp / tạo + xuất bản (undo 24h =
// tạm dừng + xoá mềm), sửa bản nháp (undo 24h), xuất bản (snapshot → phiên bản mới), quay lại (xuất bản lại snapshot cũ), tạm
// dừng / chạy, xoá mềm (undo 30 ngày; đang phụ trách kênh / hội thoại mở → HAS_DEPENDENCIES — D52). Hạn mức `plan.max_agents`.
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, agentCreate, agentDelete, agentPause, agentPublish, agentRollback, agentUpdate } from '@appchat/actions';
import { QuotaService } from '../../billing/public';
import { CLOCK, type Clock } from '../../kernel/clock';
import { uuidv7 } from '../../kernel/ids';
import type { ActionContext, PlatformTx, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { agentEvent, assertTools, blankConfig, columnsOf, configOf, countLive, liveAgent, merge, publishDraft, type AgentConfig, type AgentRow } from './agent.store';

type Cfg = ActionInput<typeof agentCreate>;
const userOf = (ctx: ActionContext) => ctx.onBehalfOfUserId ?? (ctx.actor.type === 'user' ? ctx.actor.id : null);
const CREATED_VIA = { ui: 'manual', api: 'manual', system: 'manual', assistant: 'assistant', agent: 'assistant', task: 'assistant' } as const;

/** Tạo dòng `ai_agent` (bản nháp) sau khi kiểm hạn mức gói + tool. Khoá workspace ở DB nền tảng: hai lần tạo song song không lọt hạn mức. */
async function createAgent(ctx: ActionContext, input: Cfg, tx: TenantTx, ptx: PlatformTx | undefined, now: Date): Promise<AgentRow> {
  if (!ptx) throw new AppError('INTERNAL', 500, undefined, 'agent.create cần PlatformTx');
  await ptx.$queryRaw`SELECT id FROM workspace WHERE id = ${ctx.workspaceId}::uuid FOR UPDATE`;
  await new QuotaService(ptx).assert(ctx.workspaceId, 'agents', await countLive(tx));
  const cfg = merge(blankConfig(), input as Partial<AgentConfig>);
  assertTools(cfg.tools, ctx.authz);
  const via = cfg.template_id ? 'template' : CREATED_VIA[ctx.source];
  return tx.aiAgent.create({ data: { id: uuidv7(now.getTime()), ...columnsOf(cfg), createdVia: via, createdBy: userOf(ctx), draftDirty: true, createdAt: now, updatedAt: now } });
}

@Injectable()
@ActionHandler('agent.create')
export class AgentCreateHandler implements Handler<Cfg, { agent_id: string }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: Cfg, tx: TenantTx, ptx?: PlatformTx): Promise<HandlerOutcome<{ agent_id: string }>> {
    const a = await createAgent(ctx, input, tx, ptx, this.clock.now());
    return { result: { agent_id: a.id }, after: { id: a.id } };
  }
}

@Injectable()
@ActionHandler('agent.create_and_publish')
export class AgentCreateAndPublishHandler implements Handler<Cfg, { agent_id: string; version: number }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: Cfg, tx: TenantTx, ptx?: PlatformTx): Promise<HandlerOutcome<{ agent_id: string; version: number }>> {
    const now = this.clock.now();
    const a = await createAgent(ctx, input, tx, ptx, now);
    const { version } = await publishDraft(tx, a, userOf(ctx), '', now);
    return { result: { agent_id: a.id, version }, after: { id: a.id }, events: [{ topic: 'agent.published', payload: agentEvent(a, version, 'active') }] };
  }

  async preview(_ctx: ActionContext, input: Cfg) {
    const tools = input.tools ?? [];
    return { summary: input.name, risk: 'config' as const, count: 1, changes: [{ entity: 'ai_agent', after: { name: input.name, channels: input.channels ?? [], tools, threshold: input.threshold ?? 70 } }] };
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
    const a = await liveAgent(tx, input.agent_id);
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
    const { version } = await publishDraft(tx, a, userOf(ctx), `↩ v${input.version}`, this.clock.now(), cfg);
    return { result: { agent_id: a.id, version }, after: { id: a.id, version, from: input.version }, events: [{ topic: 'agent.published', payload: agentEvent(a, version, 'active') }] };
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
}

/** Chặn xoá agent đang phụ trách tài khoản kênh / hội thoại chưa đóng (D52) → 409 kèm danh sách. */
async function assertNoDependencies(tx: TenantTx, id: string) {
  const [accounts, convs] = await Promise.all([
    tx.$queryRaw<{ id: string; name: string }[]>`SELECT id::text, name FROM channel_account WHERE status <> 'disconnected' AND settings->>'agent_id' = ${id} LIMIT 10`,
    tx.conversation.count({ where: { assigneeAgentId: id, status: { not: 'closed' } } }),
  ]);
  if (accounts.length || convs) throw new AppError('HAS_DEPENDENCIES', 409, { channel_accounts: accounts.map((x) => x.name).join(', '), conversations: String(convs) });
}
