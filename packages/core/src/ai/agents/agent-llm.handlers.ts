// Action `agent.*` chạy model (risk read — không ghi nghiệp vụ; credit trừ như mọi run): chat thử (D29 — bản nháp + `dry_run`, action
// không phải read chỉ xem trước), soạn cấu hình từ mô tả (§5.3b — đường ống TIP-021b ở `drafting/`), tối ưu prompt. Gọi model trong
// `prepare` — NGOÀI transaction của executor (lượt LLM dài không giữ connection).
import { Inject, Injectable, Optional } from '@nestjs/common';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { ActionInput, ActionPreview, agentDraftFromDescription, agentOptimizePrompt, agentTest } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import { ActionExecutor } from '../../kernel/actions/executor';
import { TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { AiRunner } from '../runs/runner';
import { connectedKeys, runToolIds } from './agent-tools';
import { trustedParent } from '../runs/run-lineage';
import { agentSystem, agentToolSpecs, dryRunTools, runOnce } from './agent.runtime';
import { blankConfig, configOf, liveAgent, merge, type AgentConfig } from './agent.store';
import { optimizeLocal, OPTIMIZE_SYSTEM } from './agent-draft';
import { AgentDraftingService } from './drafting/providers';
import type { DraftOutput } from './drafting/result';
import { draftPreview, optimizePreview, testPreview } from './previews/agent-llm.handlers.preview';
import { builderKnowledge } from '../kb/scope/context';

const need = <T>(v: T | null, what: string): T => {
  if (!v) throw new AppError('NOT_IMPLEMENTED', 501, { tip: '019' }, `${what} chưa cấu hình`);
  return v;
};
const userOf = (ctx: ActionContext) => ctx.onBehalfOfUserId ?? (ctx.actor.type === 'user' ? ctx.actor.id : null);

abstract class LlmHandler {
  constructor(
    protected readonly runner: AiRunner | null,
    protected readonly tenants: TenantDbResolver | null,
    protected readonly clock: Clock,
  ) {}

  protected db(ctx: ActionContext, job: string) {
    return need(this.tenants, 'Tenant DB').get(TenantContexts.system(ctx.workspaceId, job));
  }
}

@Injectable()
@ActionHandler('agent.test')
export class AgentTestHandler extends LlmHandler implements Handler<ActionInput<typeof agentTest>, { reply: string }> {
  constructor(
    @Inject(AiRunner) runner: AiRunner | null,
    @Optional() @Inject(TENANT_RESOLVER) tenants: TenantDbResolver | null,
    @Inject(CLOCK) clock: Clock,
    @Optional() @Inject(ActionExecutor) private readonly executor: ActionExecutor | null,
  ) {
    super(runner, tenants, clock);
  }

  async prepare(ctx: ActionContext, input: ActionInput<typeof agentTest>): Promise<string> {
    const runner = need(this.runner, 'AI runtime');
    const db = await this.db(ctx, 'agent.test');
    const saved = input.agent_id ? await liveAgent(db, input.agent_id) : null;
    // Bản nháp đang sửa trên Builder (chưa lưu) đè lên bản đã lưu.
    const cfg = merge(saved ? configOf(saved) : blankConfig(), (input.config ?? {}) as Partial<AgentConfig>);
    const agent = { id: saved?.id ?? ctx.authz.userId, toolIds: cfg.tools };
    const connected = await connectedKeys(db);
    const r = await runOnce(db, runner, () => this.clock.now(), ctx.workspaceId, {
      run: { kind: 'agent_reply', title: cfg.name || 'agent.test', tier: cfg.model_tier, agentId: saved?.id ?? null, agentVersion: saved?.publishedVersion ?? null, initiatedByUserId: userOf(ctx), dryRun: true, knowledge: builderKnowledge(cfg, userOf(ctx) ?? ctx.authz.userId, { channel: !!input.channel, agentId: saved?.id ?? null }) },
      parent: await trustedParent(db, ctx, 'agent.test'),
      system: input.channel ? `${agentSystem(cfg)}\n\n# MÔ PHỎNG KÊNH\nKhách đang nhắn qua kênh: ${input.channel}. Trả lời đúng phong cách kênh này.` : agentSystem(cfg),
      prompt: input.text,
      source: 'agent_test',
      tools: (runId) => dryRunTools(agentToolSpecs(need(this.executor, 'ActionExecutor'), runToolIds(cfg.tools, connected), { workspaceId: ctx.workspaceId, agent, commander: ctx.authz, runId, source: 'agent' })),
    });
    if (r.status === 'failed') throw new AppError(r.error?.code === 'CREDIT_EXHAUSTED' ? 'CREDIT_EXHAUSTED' : 'INTERNAL', r.error?.code === 'CREDIT_EXHAUSTED' ? 402 : 502, { run_id: r.runId }, r.error?.message);
    return r.text;
  }

  async execute(_ctx: ActionContext, _input: unknown, _tx: unknown, _ptx: unknown, prepared?: unknown): Promise<HandlerOutcome<{ reply: string }>> {
    return { result: { reply: String(prepared ?? '') } };
  }

  async preview(_ctx: ActionContext, input: ActionInput<typeof agentTest>, tx: TenantTx): Promise<ActionPreview> {
    return testPreview(tx, input);
  }
}

@Injectable()
@ActionHandler('agent.draft_from_description')
export class AgentDraftHandler implements Handler<ActionInput<typeof agentDraftFromDescription>, DraftOutput> {
  constructor(@Optional() @Inject(AgentDraftingService) private readonly drafting: AgentDraftingService | null) {}

  async prepare(ctx: ActionContext, input: ActionInput<typeof agentDraftFromDescription>): Promise<DraftOutput> {
    return need(this.drafting, 'AgentDraftingService').draft(ctx, input);
  }

  async execute(_ctx: ActionContext, _input: unknown, _tx: unknown, _ptx: unknown, prepared?: unknown): Promise<HandlerOutcome<DraftOutput>> {
    return { result: prepared as DraftOutput };
  }

  async preview(_ctx: ActionContext, input: ActionInput<typeof agentDraftFromDescription>): Promise<ActionPreview> {
    return draftPreview(input);
  }
}

@Injectable()
@ActionHandler('agent.optimize_prompt')
export class AgentOptimizePromptHandler extends LlmHandler implements Handler<ActionInput<typeof agentOptimizePrompt>, { prompt: string }> {
  constructor(@Inject(AiRunner) runner: AiRunner | null, @Optional() @Inject(TENANT_RESOLVER) tenants: TenantDbResolver | null, @Inject(CLOCK) clock: Clock) {
    super(runner, tenants, clock);
  }

  async prepare(ctx: ActionContext, input: ActionInput<typeof agentOptimizePrompt>): Promise<string> {
    const runner = need(this.runner, 'AI runtime');
    const db = await this.db(ctx, 'agent.optimize');
    const r = await runOnce(db, runner, () => this.clock.now(), ctx.workspaceId, {
      run: { kind: 'assistant', title: 'agent.optimize_prompt', tier: 'standard', initiatedByUserId: userOf(ctx) },
      parent: await trustedParent(db, ctx, 'agent.optimize_prompt'),
      system: OPTIMIZE_SYSTEM,
      prompt: input.prompt || '(trống)',
      source: 'assistant',
    });
    return optimizeLocal(input.prompt, r.status === 'completed' ? r.text : '');
  }

  async execute(_ctx: ActionContext, _input: unknown, _tx: unknown, _ptx: unknown, prepared?: unknown): Promise<HandlerOutcome<{ prompt: string }>> {
    return { result: { prompt: String(prepared ?? '') } };
  }

  async preview(_ctx: ActionContext, input: ActionInput<typeof agentOptimizePrompt>): Promise<ActionPreview> {
    return optimizePreview(input);
  }
}
