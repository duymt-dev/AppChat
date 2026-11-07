// Action AI của marketing (TIP-037, DC-246): campaign.suggest đọc gợi ý đã lưu (không gọi model); campaign.analyze ghi yêu cầu + event →
// worker ROLE=ai chạy model (trả 202 job — trạng thái đọc ở run); campaign.draft_content viết lại nội dung theo giọng (model trong
// `prepare`, ngoài transaction; chỉ trả đề xuất, không lưu); campaign.store_analysis (SYSTEM_ONLY) đọc kết quả run đã xong, kiểm lại cấu
// trúc + đếm khách thật theo scope người yêu cầu rồi thay bộ gợi ý (gợi ý đã dùng giữ nguyên).
import { Inject, Injectable, Optional } from '@nestjs/common';
import { TenantContexts } from '@appchat/db';
import { AppError, type SegmentNode } from '@appchat/shared';
import type { ActionInput, ActionPreview, campaignAnalyze, campaignDraftContent, campaignStoreAnalysis, campaignSuggest } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { created, preview } from '../../kernel/actions/preview-kit';
import { uuidv7 } from '../../kernel/ids';
import { actorUserId } from '../../crm/public';
import { AiRunner } from '../../ai/runs/runner';
import { trustedParent } from '../../ai/runs/run-lineage';
import { runOnce } from '../../ai/agents/agent.runtime';
import { DRAFT_MAX_CREDITS, draftSystem, parseSuggestions } from '../ai/marketing-ai.service';
import { unknownVariables } from '../services/campaign-policy';
import { MarketingDeps } from '../services/marketing-deps';
import { MARKETING_ACTORS, assertSystem } from '../services/marketing-system';
import { countAudience } from '../services/segments.service';

@Injectable()
@ActionHandler('campaign.suggest')
export class CampaignSuggestHandler implements Handler<ActionInput<typeof campaignSuggest>, { suggestions: { id: string; title: string; est_count: number }[] }> {
  async execute(_ctx: ActionContext, _input: unknown, tx: TenantTx): Promise<HandlerOutcome<{ suggestions: { id: string; title: string; est_count: number }[] }>> {
    const rows = await tx.campaignSuggestion.findMany({ where: { status: 'new' }, orderBy: [{ generatedAt: 'desc' }, { id: 'asc' }], take: 8, select: { id: true, title: true, estCount: true } });
    return { result: { suggestions: rows.map((r) => ({ id: r.id, title: r.title, est_count: r.estCount })) } };
  }
}

@Injectable()
@ActionHandler('campaign.analyze')
export class CampaignAnalyzeHandler implements Handler<ActionInput<typeof campaignAnalyze>, { run_id: string; status: string }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async preview(ctx: ActionContext): Promise<ActionPreview> {
    return preview('write', 'campaign.analyze', { changes: [created('campaign_suggestion', { kinds: 'reactivation, upsell, conversion, aftercare', requested_by: actorUserId(ctx) })] });
  }

  async execute(ctx: ActionContext, _input: unknown, tx: TenantTx): Promise<HandlerOutcome<{ run_id: string; status: string }>> {
    const me = actorUserId(ctx);
    if (!me) throw new AppError('FORBIDDEN', 403, { actor: 'user_required' });
    const now = this.clock.now();
    // Một yêu cầu đang chờ của người này → trả lại yêu cầu đó (bấm lại không chạy model lần hai).
    const pending = await tx.outboxEvent.findFirst({ where: { topic: 'campaign.analysis_requested', status: 'pending', payload: { path: ['requested_by'], equals: me } }, select: { payload: true } });
    const runId = (pending?.payload as { run_id?: string } | undefined)?.run_id ?? uuidv7(now.getTime());
    return {
      result: { run_id: runId, status: 'queued' },
      ...(pending ? {} : { events: [{ topic: 'campaign.analysis_requested', payload: { run_id: runId, requested_by: me } }] }),
    };
  }
}

@Injectable()
@ActionHandler('campaign.draft_content')
export class CampaignDraftContentHandler implements Handler<ActionInput<typeof campaignDraftContent>, { text: string; run_id: string }> {
  constructor(
    @Inject(MarketingDeps) private readonly d: MarketingDeps,
    @Optional() @Inject(AiRunner) private readonly runner: AiRunner | null,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async prepare(ctx: ActionContext, input: ActionInput<typeof campaignDraftContent>): Promise<{ text: string; run_id: string }> {
    if (!this.runner) throw new AppError('NOT_IMPLEMENTED', 501, { tip: '019' });
    if (unknownVariables(input.text).length) throw new AppError('VALIDATION_FAILED', 422, { text: 'unknown_variable' });
    const db = await this.d.tenants().get(TenantContexts.system(ctx.workspaceId, 'campaign.draft_content'));
    const r = await runOnce(db, this.runner, () => this.clock.now(), ctx.workspaceId, {
      run: { kind: 'consult', title: 'campaign.draft_content', tier: 'standard', initiatedByUserId: actorUserId(ctx), input: { tone: input.tone, channel: input.channel } },
      parent: await trustedParent(db, ctx, 'campaign.draft_content'),
      system: draftSystem(input.tone, input.channel),
      prompt: input.text,
      source: 'marketing',
      maxCredits: DRAFT_MAX_CREDITS,
    });
    if (r.status === 'failed') throw new AppError(r.error?.code === 'CREDIT_EXHAUSTED' ? 'CREDIT_EXHAUSTED' : 'INTERNAL', r.error?.code === 'CREDIT_EXHAUSTED' ? 402 : 502, { run_id: r.runId }, r.error?.message);
    const text = r.text.trim().slice(0, 4000);
    // Model đưa biến lạ → không trả đề xuất hỏng (người dùng giữ bản gốc).
    if (!text || unknownVariables(text).length) throw new AppError('INTERNAL', 502, { run_id: r.runId, text: 'invalid_model_output' });
    return { text, run_id: r.runId };
  }

  async execute(_ctx: ActionContext, _input: unknown, _tx: unknown, _ptx: unknown, prepared?: unknown): Promise<HandlerOutcome<{ text: string; run_id: string }>> {
    return { result: prepared as { text: string; run_id: string } };
  }
}

@Injectable()
@ActionHandler('campaign.store_analysis')
export class CampaignStoreAnalysisHandler implements Handler<ActionInput<typeof campaignStoreAnalysis>, { stored: number }> {
  constructor(
    @Inject(MarketingDeps) private readonly d: MarketingDeps,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async preview(ctx: ActionContext): Promise<never> {
    throw new AppError('FORBIDDEN', 403, { source: ctx.source });
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof campaignStoreAnalysis>, tx: TenantTx): Promise<HandlerOutcome<{ stored: number }>> {
    assertSystem(ctx, MARKETING_ACTORS.analysis);
    const run = await tx.aiRun.findUnique({ where: { id: input.run_id }, select: { status: true, title: true, output: true, initiatedByUserId: true, finishedAt: true } });
    if (!run || run.title !== 'campaign.analyze') throw new AppError('NOT_FOUND', 404, { run_id: 'not_found' });
    if (run.status !== 'completed') throw new AppError('INVALID_STATE', 409, { run: run.status });
    if (await tx.campaignSuggestion.findFirst({ where: { runId: input.run_id }, select: { id: true } })) return { result: { stored: 0 } };
    const authz = await this.d.authzOf(ctx.workspaceId, run.initiatedByUserId);
    if (!authz) throw new AppError('FORBIDDEN', 403, { run_id: 'requester_gone' });
    const list = parseSuggestions(((run.output ?? {}) as { text?: string }).text ?? '') ?? [];
    const now = this.clock.now();
    await tx.campaignSuggestion.updateMany({ where: { status: 'new' }, data: { status: 'dismissed' } });
    for (const s of list) {
      const n = await countAudience(tx, authz, { filter: s.filter as SegmentNode }, s.channel, now);
      await tx.campaignSuggestion.create({
        data: { id: uuidv7(now.getTime()), kind: s.kind, title: s.title, reason: s.reason, segmentFilter: s.filter as object, estCount: n.reachable, bestTime: s.best_time, channel: s.channel, subject: s.subject, body: s.body, cta: s.cta, runId: input.run_id, generatedAt: run.finishedAt ?? now },
      });
    }
    return { result: { stored: list.length }, events: [{ topic: 'campaign.suggestions_updated', payload: { run_id: input.run_id, count: list.length } }] };
  }
}
