// Handler mỏng cho 4 kỹ năng tiện ích chỉ đọc (TIP-019c §3.1): mỗi handler chỉ chọn nguồn + prompt + bộ kiểm, phần còn lại ở utility-run.
// Preview chỉ giải nguồn theo quyền (không gọi model, không trừ credit) + cảnh báo `uses_credit`. Không ghi nghiệp vụ nào.
import { Inject, Injectable, Optional } from '@nestjs/common';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import { AppError, DEFAULT_INTENTS, validateExtract, validateIntent, validateLead, validateSummarize, type AuthzContext, type UtilityEnvelope } from '@appchat/shared';
import type { ActionInput, ActionPreview, aiDetectIntent, aiExtractInfo, aiScoreLead, aiSummarize } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import { PLATFORM_DB, TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { line, preview } from '../../kernel/actions/preview-kit';
import { AiRunner } from '../runs/runner';
import { trustedParent } from '../runs/run-lineage';
import { resolveLeadSource, resolveSource, type ResolvedSources, type SourceChunk } from './utility-sources';
import { extractSystem, intentSystem, leadSystem, summarizeSystem } from './utility-prompts';
import { readSources, recheck, runUtility, utilityUser, type PreparedUtility } from './utility-run';

type Resolve = (tx: TenantTx, a: AuthzContext) => Promise<ResolvedSources>;
interface Plan {
  resolve: Resolve;
  system: (locale: 'vi' | 'en') => string;
  validate: (raw: unknown, chunks: SourceChunk[], src: ResolvedSources) => unknown;
}

abstract class UtilityHandler<I extends { locale?: 'vi' | 'en' }> implements Handler<I, UtilityEnvelope> {
  protected abstract readonly id: string;
  protected abstract plan(ctx: ActionContext, input: I): Plan;

  constructor(
    @Inject(AiRunner) private readonly runner: AiRunner | null,
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver | null,
    @Optional() @Inject(PLATFORM_DB) private readonly platform: Pick<PlatformDb, 'user'> | null,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async prepare(ctx: ActionContext, input: I): Promise<PreparedUtility> {
    if (!this.runner || !this.tenants) throw new AppError('NOT_IMPLEMENTED', 501, { tip: '019c' });
    const db = await this.tenants.get(TenantContexts.system(ctx.workspaceId, this.id));
    const p = this.plan(ctx, input);
    const src = await readSources(db, (tx) => p.resolve(tx, ctx.authz));
    const userId = utilityUser(ctx);
    const u = !input.locale && userId && this.platform ? await this.platform.user.findUnique({ where: { id: userId }, select: { locale: true } }) : null;
    const locale = input.locale ?? (u?.locale === 'en' ? 'en' : 'vi');
    return runUtility(db, this.runner, () => this.clock.now(), src, {
      actionId: this.id, ws: ctx.workspaceId, userId, locale,
      system: p.system(locale),
      validate: (raw, chunks) => p.validate(raw, chunks, src),
      // Run chỉ lưu tham chiếu nguồn (id) — không lưu chữ nguồn / chữ người gọi vào input run.
      input: { action_id: this.id, refs: src.refs, origin: src.origin },
      parent: await trustedParent(db, ctx, this.id),
      conversationId: src.refs.conversation_id ?? null,
    });
  }

  async execute(ctx: ActionContext, input: I, tx: TenantTx, _ptx: unknown, prepared?: unknown): Promise<HandlerOutcome<UtilityEnvelope>> {
    return { result: await recheck(tx, ctx.authz, prepared as PreparedUtility, this.plan(ctx, input).resolve) };
  }

  async preview(ctx: ActionContext, input: I, tx: TenantTx): Promise<ActionPreview> {
    const src = await this.plan(ctx, input).resolve(tx, ctx.authz);
    return preview('read', line(this.id, `${src.chunks.length}`), { warnings: ['uses_credit'] });
  }
}

const served = (ctx: ActionContext) => ctx.servedConversationId;

@Injectable()
@ActionHandler('ai.summarize')
export class AiSummarizeHandler extends UtilityHandler<ActionInput<typeof aiSummarize>> {
  protected readonly id = 'ai.summarize';
  protected plan(ctx: ActionContext, i: ActionInput<typeof aiSummarize>): Plan {
    const max = i.max_bullets ?? 5;
    return { resolve: (tx, a) => resolveSource(tx, a, i.source, served(ctx)), system: (l) => summarizeSystem(l, max), validate: (raw, chunks) => validateSummarize(raw, chunks, max) };
  }
}

@Injectable()
@ActionHandler('ai.detect_intent')
export class AiDetectIntentHandler extends UtilityHandler<ActionInput<typeof aiDetectIntent>> {
  protected readonly id = 'ai.detect_intent';
  protected plan(ctx: ActionContext, i: ActionInput<typeof aiDetectIntent>): Plan {
    const keys = i.taxonomy?.map((t) => t.key) ?? [...DEFAULT_INTENTS];
    const version = i.taxonomy ? `custom:${keys.join(',')}` : 'default-v1';
    return { resolve: (tx, a) => resolveSource(tx, a, i.source, served(ctx)), system: (l) => intentSystem(l, i.taxonomy), validate: (raw, chunks) => validateIntent(raw, chunks, keys, version) };
  }
}

@Injectable()
@ActionHandler('ai.extract_info')
export class AiExtractInfoHandler extends UtilityHandler<ActionInput<typeof aiExtractInfo>> {
  protected readonly id = 'ai.extract_info';
  protected plan(ctx: ActionContext, i: ActionInput<typeof aiExtractInfo>): Plan {
    return { resolve: (tx, a) => resolveSource(tx, a, i.source, served(ctx)), system: (l) => extractSystem(l, i.fields), validate: (raw, chunks, src) => validateExtract(raw, chunks, i.fields, src.origin) };
  }
}

@Injectable()
@ActionHandler('ai.score_lead')
export class AiScoreLeadHandler extends UtilityHandler<ActionInput<typeof aiScoreLead>> {
  protected readonly id = 'ai.score_lead';
  protected plan(ctx: ActionContext, i: ActionInput<typeof aiScoreLead>): Plan {
    return { resolve: (tx, a) => resolveLeadSource(tx, a, i, served(ctx)), system: (l) => leadSystem(l), validate: (raw, chunks) => validateLead(raw, chunks) };
  }
}

export const UTILITY_HANDLERS = [AiSummarizeHandler, AiDetectIntentHandler, AiExtractInfoHandler, AiScoreLeadHandler];
