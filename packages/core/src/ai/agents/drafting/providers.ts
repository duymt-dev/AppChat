// Dịch vụ soạn cấu hình agent (TIP-021b §1–§4.1): một đường ống duy nhất cho API và ROLE=ai (cùng handler qua ActionExecutor). Thứ tự:
// nhận binding bền → tạo run (019b, cha tin cậy) → discovery có đo dưới run đó → sinh theo schema (không tool, kết quả riêng) → kiểm theo
// quyền HIỆN HÀNH → công bố CAS. Không transaction nào giữ qua embed / model. Dừng cứng không bao giờ thành bản soạn; mẫu tất định chỉ
// cho lý do đã khai và luôn giao với đúng tập ứng viên đã tìm. Mỗi lần soạn là một gốc riêng → không dùng cache câu hỏi 023e.
import { Inject, Injectable, Optional } from '@nestjs/common';
import { PiiMasker, type ModelSource } from '@appchat/ai';
import { TenantContexts, type PlatformDb, type TenantDb, type TenantDbResolver } from '@appchat/db';
import { AppError, type AuthzContext } from '@appchat/shared';
import { CreditMeter } from '../../../billing/public';
import { AuthzResolver } from '../../../authz/services/authz-resolver';
import { CLOCK, type Clock } from '../../../kernel/clock';
import { ActionExecutor, implementedBy } from '../../../kernel/actions/executor';
import type { ActionContext } from '../../../kernel/actions/action-context';
import { PLATFORM_DB, TENANT_RESOLVER } from '../../../kernel/tenant/tenant.providers';
import { uuidv7 } from '../../../kernel/ids';
import { AiRunner } from '../../runs/runner';
import { RunStore } from '../../runs/run.store';
import { trustedParent } from '../../runs/run-lineage';
import { isMeteringStop, queryEmbedder } from '../../runs/metered-embedding';
import { DISCOVERY_MODEL_SOURCE } from '../../assistant/discovery/prepare.handler';
import { pinnedEmbedder } from '../../assistant/discovery/pinned-embedder';
import type { QueryVector } from '../../assistant/discovery/service';
import { draftFromText, parseDraft } from '../agent-draft';
import { allocateDraft, assertNotRunning, draftIdentity, type DraftBinding } from './admission';
import { discoverDraftTools, embeddingSpaceKey, type DraftDiscovery } from './discovery';
import { abortDraftRun, createDraftRun, runDraft } from './generation';
import { bindCandidates, candidatesOf, discoveryOf, publishDraft, recordGenerated, rejectDraft } from './publication';
import { generationInfo, reproject, stopError, type DraftOutput, type FallbackReason } from './result';
import { currentManager, validateDraft } from './validation';
import { DRAFT_SCHEMA_VERSION } from '@appchat/actions';

const userOf = (ctx: ActionContext) => ctx.onBehalfOfUserId ?? (ctx.actor.type === 'user' ? ctx.actor.id : null);

@Injectable()
export class AgentDraftingService {
  constructor(
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver | null,
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | null,
    @Inject(AiRunner) private readonly runner: AiRunner | null,
    @Inject(CLOCK) private readonly clock: Clock,
    @Optional() @Inject(ActionExecutor) private readonly executor: ActionExecutor | null,
    @Optional() @Inject(AuthzResolver) private readonly authz: AuthzResolver | null = null,
    @Optional() @Inject(DISCOVERY_MODEL_SOURCE) private readonly models: ModelSource | null = null,
    @Optional() @Inject(CreditMeter) private readonly meter: CreditMeter | null = null,
  ) {}

  private now = () => this.clock.now();

  /** Quyền HIỆN TẠI của người ra lệnh (đọc lại membership — không dùng AuthzContext lúc bắt đầu). Không có resolver (test) → ctx.authz. */
  private currentAuthz(ctx: ActionContext): () => Promise<AuthzContext | null> {
    const userId = userOf(ctx);
    if (!userId || !this.platform || !this.authz) return async () => ctx.authz;
    return async () => {
      const m = await this.platform!.membership.findFirst({ where: { workspaceId: ctx.workspaceId, userId, status: 'active' }, select: { roleKey: true, delegations: true } });
      return m ? this.authz!.resolve(ctx.workspaceId, userId, m) : null;
    };
  }

  async draft(ctx: ActionContext, input: { description: string; request_id: string }): Promise<DraftOutput> {
    if (!this.tenants) throw new AppError('NOT_IMPLEMENTED', 501, { tip: '021b' }, 'Tenant DB chưa cấu hình');
    const db = await this.tenants.get(TenantContexts.system(ctx.workspaceId, 'agent.draft'));
    const implemented = this.executor ? implementedBy(this.executor) : () => false;
    const authzOf = this.currentAuthz(ctx);
    const id = draftIdentity(ctx.actor, ctx.onBehalfOfUserId, input.request_id, input.description, DRAFT_SCHEMA_VERSION);
    const runId = this.runner ? uuidv7(this.now().getTime()) : null;
    const { binding, created } = await db.$transaction((tx) => allocateDraft(tx as never, id, runId, this.now()));
    if (!created) return this.replay(db, binding, authzOf, implemented, input.description);
    return this.produce(db, ctx, binding, authzOf, implemented, input.description);
  }

  /** Gửi lại cùng request_id: đã công bố → chiếu lại theo quyền hiện tại; dừng → cùng lỗi; đang chạy → 409; chữ đã bền quá lease → kiểm lại. */
  private async replay(db: TenantDb, b: DraftBinding, authzOf: () => Promise<AuthzContext | null>, implemented: (id: string) => boolean, description: string): Promise<DraftOutput> {
    const authz = await currentManager(authzOf);
    if (b.phase === 'published') return reproject(b, authz, implemented);
    if (b.phase === 'rejected' || b.phase === 'invalidated') throw stopError(b.safeReason ?? 'CONFLICT', b.id, b.runId);
    assertNotRunning(b, this.now());
    // Quá lease: đã có chữ model bền → kiểm lại dưới cùng fence (không gọi model); chưa có → không rõ usage, không gọi lại.
    if (b.phase === 'awaiting_validation' && b.protectedResult) return this.validateAndPublish(db, b, b.validationGeneration, b.protectedResult, authzOf, implemented, description);
    await db.$transaction((tx) => rejectDraft(tx as never, b.id, 'USAGE_UNKNOWN'));
    throw stopError('USAGE_UNKNOWN', b.id, b.runId);
  }

  private async produce(db: TenantDb, ctx: ActionContext, b: DraftBinding, authzOf: () => Promise<AuthzContext | null>, implemented: (id: string) => boolean, description: string): Promise<DraftOutput> {
    const stop = async (code: string): Promise<never> => {
      await db.$transaction((tx) => rejectDraft(tx as never, b.id, code));
      throw stopError(code, b.id, b.runId);
    };
    const authz = await currentManager(authzOf).catch(() => stop('FORBIDDEN'));
    const run = this.runner && b.runId ? await createDraftRun(db, this.now, { runId: b.runId, userId: userOf(ctx), parent: await trustedParent(db, ctx, 'agent.draft_from_description') }) : null;
    if (this.runner && b.runId && !run) return stop('CONFLICT');
    let found: DraftDiscovery;
    try {
      found = await discoverDraftTools({ db, models: this.models, queryVector: run ? (space) => this.queryVector(db, ctx.workspaceId, run.id, run.rootRunId, embeddingSpaceKey(space)) : null, cache: null }, authz, implemented, description);
    } catch (err) {
      const code = String((err as { code?: string })?.code ?? 'LLM_ERROR');
      if (run) await abortDraftRun(db, this.now, run.id, code);
      return stop(code);
    }
    await db.$transaction((tx) => bindCandidates(tx as never, b.id, found, this.now()));
    const bound: DraftBinding = { ...b, candidates: found.candidates, candidateFingerprint: found.fingerprint, discovery: { strategy: found.strategy, reason: found.reason, corpus_version: found.corpusVersion } };
    if (!run || !this.runner) return this.fallback(db, bound, authzOf, implemented, description, 'no_model_route');
    const g = await runDraft(db, this.runner, this.now, ctx.workspaceId, run, description, found.candidates);
    if (g.kind === 'stop') return stop(g.code);
    if (g.kind === 'fallback') return this.fallback(db, bound, authzOf, implemented, description, g.reason);
    const generation = await db.$transaction((tx) => recordGenerated(tx as never, b.id, g.text, this.now()));
    if (generation === null) return stop('CONFLICT');
    return this.validateAndPublish(db, bound, generation, g.text, authzOf, implemented, description);
  }

  /** Embed từng đoạn câu hỏi dưới run soạn (biên nhận `query_embed` 019b). Dừng cứng ném lên; lỗi provider khác → keyword trung thực. */
  private queryVector(db: TenantDb, ws: string, runId: string, rootRunId: string, spaceKey: string): QueryVector {
    return async (query) => {
      if (!this.models) return null;
      const embed = queryEmbedder({ db: new RunStore(db, this.now).metered(), embedder: pinnedEmbedder(this.models, spaceKey), meter: this.meter, now: this.now }, { ws, runId, rootRunId, source: 'agent_draft' });
      try {
        return (await embed(new PiiMasker().mask(query))).vectors[0] ?? null;
      } catch (err) {
        if (isMeteringStop(err)) throw err;
        return null;
      }
    };
  }

  private async validateAndPublish(db: TenantDb, b: DraftBinding, generation: number, text: string, authzOf: () => Promise<AuthzContext | null>, implemented: (id: string) => boolean, description: string): Promise<DraftOutput> {
    const candidates = candidatesOf(b.candidates);
    const parsed = parseDraft(text, new Set(candidates.map((c) => c.id)));
    // Khuôn sai sau khi engine đã nhận (lớp kiểm thứ hai của core) — usage đã ghi; mẫu tất định có lý do, không gọi lần hai.
    if (!parsed) return this.fallback(db, b, authzOf, implemented, description, 'malformed_output', generation);
    return this.publish(db, b, generation, parsed, authzOf, implemented);
  }

  private fallback(db: TenantDb, b: DraftBinding, authzOf: () => Promise<AuthzContext | null>, implemented: (id: string) => boolean, description: string, reason: FallbackReason, generation: number | null = null): Promise<DraftOutput> {
    const draft = draftFromText(description, candidatesOf(b.candidates).map((c) => c.id));
    return this.publish(db, b, generation, draft, authzOf, implemented, reason);
  }

  private async publish(db: TenantDb, b: DraftBinding, generation: number | null, draft: DraftOutput['draft'], authzOf: () => Promise<AuthzContext | null>, implemented: (id: string) => boolean, fallback?: FallbackReason): Promise<DraftOutput> {
    let authz: AuthzContext;
    try {
      authz = await currentManager(authzOf);
    } catch (e) {
      await db.$transaction((tx) => rejectDraft(tx as never, b.id, 'FORBIDDEN'));
      throw e;
    }
    const d = discoveryOf(b.discovery);
    const strategy = d.strategy ?? 'none';
    let v;
    try {
      v = validateDraft(draft, candidatesOf(b.candidates), authz, implemented, strategy !== 'hybrid');
    } catch (e) {
      await db.$transaction((tx) => rejectDraft(tx as never, b.id, 'stale_candidates'));
      throw e;
    }
    const out: DraftOutput = { draft: v.draft, generation_info: generationInfo(b, strategy, v.warnings, fallback) };
    const ok = await db.$transaction((tx) => publishDraft(tx as never, b.id, generation, out as unknown as object));
    // Mất CAS: huỷ / vô hiệu / tiến trình khác đã chốt — đọc lại thật, không tự quyết.
    if (!ok) {
      const now = await db.agentDraftPublication.findUnique({ where: { id: b.id } });
      if (now?.phase === 'published') return reproject(now as unknown as DraftBinding, authz, implemented);
      throw stopError(now?.safeReason ?? 'CONFLICT', b.id, b.runId);
    }
    return out;
  }
}

export const AGENT_DRAFTING_PROVIDERS = [AgentDraftingService] as const;
