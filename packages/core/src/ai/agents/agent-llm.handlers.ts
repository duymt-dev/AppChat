// Action `agent.*` chạy model (risk read — không ghi nghiệp vụ; credit trừ như mọi run): chat thử (D29 — bản nháp + `dry_run`, action
// không phải read chỉ xem trước), soạn cấu hình từ mô tả (§5.3b), tối ưu prompt. Gọi model trong `prepare` — NGOÀI transaction của
// executor (lượt LLM dài không giữ connection). Model trả không đúng định dạng (model giả / lỗi) → bản tất định, vẫn dùng được.
import { Inject, Injectable, Optional } from '@nestjs/common';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { ActionInput, agentDraftFromDescription, agentOptimizePrompt, agentTest } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import { ActionExecutor } from '../../kernel/actions/executor';
import { TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import type { ActionContext } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { AiRunner } from '../runs/runner';
import { connectedKeys, runToolIds } from './agent-tools';
import { agentSystem, agentToolSpecs, dryRunTools, runOnce } from './agent.runtime';
import { blankConfig, configOf, liveAgent, merge, type AgentConfig } from './agent.store';
import { draftFromText, optimizeLocal, parseDraft, DRAFT_SYSTEM, OPTIMIZE_SYSTEM } from './agent-draft';

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
      run: { kind: 'agent_reply', title: cfg.name || 'agent.test', tier: cfg.model_tier, agentId: saved?.id ?? null, agentVersion: saved?.publishedVersion ?? null, initiatedByUserId: userOf(ctx), dryRun: true },
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
}

@Injectable()
@ActionHandler('agent.draft_from_description')
export class AgentDraftHandler extends LlmHandler implements Handler<ActionInput<typeof agentDraftFromDescription>, { draft: AgentConfig }> {
  constructor(@Inject(AiRunner) runner: AiRunner | null, @Optional() @Inject(TENANT_RESOLVER) tenants: TenantDbResolver | null, @Inject(CLOCK) clock: Clock) {
    super(runner, tenants, clock);
  }

  async prepare(ctx: ActionContext, input: ActionInput<typeof agentDraftFromDescription>): Promise<AgentConfig> {
    const runner = need(this.runner, 'AI runtime');
    const db = await this.db(ctx, 'agent.draft');
    const r = await runOnce(db, runner, () => this.clock.now(), ctx.workspaceId, {
      run: { kind: 'assistant', title: 'agent.draft_from_description', tier: 'standard', initiatedByUserId: userOf(ctx) },
      system: DRAFT_SYSTEM,
      prompt: input.description,
      source: 'assistant',
    });
    // Tool gợi ý chỉ giữ cái người ra lệnh có quyền (§5.3b) — lọc ở parseDraft theo authz.
    return parseDraft(r.status === 'completed' ? r.text : '', ctx.authz) ?? draftFromText(input.description, ctx.authz);
  }

  async execute(_ctx: ActionContext, _input: unknown, _tx: unknown, _ptx: unknown, prepared?: unknown): Promise<HandlerOutcome<{ draft: AgentConfig }>> {
    return { result: { draft: prepared as AgentConfig } };
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
      system: OPTIMIZE_SYSTEM,
      prompt: input.prompt || '(trống)',
      source: 'assistant',
    });
    return optimizeLocal(input.prompt, r.status === 'completed' ? r.text : '');
  }

  async execute(_ctx: ActionContext, _input: unknown, _tx: unknown, _ptx: unknown, prepared?: unknown): Promise<HandlerOutcome<{ prompt: string }>> {
    return { result: { prompt: String(prepared ?? '') } };
  }
}
