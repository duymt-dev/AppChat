// Cổng dịch vụ Trợ lý cho controller HTTP (TIP-023): gom phụ thuộc (executor, runner, Redis, gói) và mở DB tenant theo người gọi.
// Thiếu runtime AI (chưa có engine) → lượt hội thoại 501; phần đọc (home, phiên, nhật ký) vẫn chạy.
import { Inject, Injectable, Optional } from '@nestjs/common';
import type { PlatformDb, TenantDb, TenantDbResolver } from '@appchat/db';
import { TenantContexts } from '@appchat/db';
import { AppError, type AuthzContext, type RecordProposalDto } from '@appchat/shared';
import { isProposalIntent, parseRecordIntent } from './record-intent/registry';
import { proposeForRecord, readProposal } from './record-intent/recovery';
import { CreditMeter, QuotaService } from '../../billing/public';
import { STORAGE, type Storage } from '../../kernel/files/storage';
import type { ModelSource } from '@appchat/ai';
import { DISCOVERY_MODEL_SOURCE } from './discovery/prepare.handler';
import { discoveryCacheOf } from './discovery/cache';
import { CLOCK, type Clock } from '../../kernel/clock';
import { ActionExecutor, implementedBy } from '../../kernel/actions/executor';
import { GenUiIntents } from '../../kernel/actions/genui-intent';
import { REDIS, type KeyValueStore } from '../../kernel/redis';
import { markDirty } from '../../kernel/outbox/outbox';
import { uuidv7 } from '../../kernel/ids';
import type { Redis } from 'ioredis';
import { AI_ENV, type AiEnv } from '../ai.env';
import type { Publisher } from './genui/stream';
import { PLATFORM_DB, TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import { AiRunner } from '../runs/runner';
import { listActionLogs, type LogFilter } from './action-logs.read';
import { editPreview } from './edit-preview';
import { assistantHome } from './home.read';
import { runTrace } from './run-trace.read';
import { presentUi } from './genui/history';
import { CursorSigner, EventStore } from './genui/event-store';
import { resolveRefs } from './genui/refs';
import { sessionMessages } from './sessions';
import { getArtifact, readParts } from './input/read';

const ATTACHMENT_ONLY = { vi: 'Tệp đính kèm nói gì?', en: 'What does the attached file say?' } as const;
import { listSessionsPage } from './session-list';
import { agentChoicesPage } from './plans/agent-choices';
import { planOfSession } from './plans/repo';
import { planToDto } from './plans/progress';
import { ownSession } from './sessions';
import { assistantConfirm, assistantTurn, prepareTurn, replayTurn, type AssistantDeps, type PreparedTurn, type ConfirmRequest, type TurnRequest } from './turn.service';
import { waitDone } from './genui/turn-wait';
import { draftReply, type DraftRequest } from './genui/inbox-draft';

export interface Caller {
  workspaceId: string;
  userId: string;
  authz: AuthzContext;
}

@Injectable()
export class AssistantService {
  constructor(
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver | null,
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | null,
    @Optional() @Inject(ActionExecutor) private readonly executor: ActionExecutor | null,
    @Inject(AiRunner) private readonly runner: AiRunner | null,
    @Optional() @Inject(REDIS) private readonly kv: KeyValueStore | null,
    @Inject(QuotaService) private readonly quota: QuotaService | null,
    @Inject(CLOCK) private readonly clock: Clock,
    @Optional() @Inject(GenUiIntents) private readonly intents: GenUiIntents | null = null,
    @Optional() @Inject(AI_ENV) private readonly env: Pick<AiEnv, 'ASSISTANT_DISPATCH'> | null = null,
    @Optional() @Inject(DISCOVERY_MODEL_SOURCE) private readonly discoveryModels: ModelSource | null = null,
    @Optional() @Inject(CreditMeter) private readonly meter: CreditMeter | null = null,
    @Optional() @Inject(STORAGE) private readonly storage: Storage | null = null,
  ) {}

  /** Redis của kernel (ioredis) có `publish` — dùng phát sự kiện lượt; KeyValueStore tối thiểu không có thì bỏ phát (chỉ ghi sổ). */
  private publisher(): Publisher | null {
    const r = this.kv as Partial<Publisher> | null;
    return r && typeof r.publish === 'function' ? (r as Publisher) : null;
  }

  /** Ký / kiểm cursor SSE (gắn run + người xem). Khoá dẫn xuất riêng, không dùng chung khoá intent. */
  private signer: CursorSigner | null = null;
  cursors(): CursorSigner {
    if (!this.intents) throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'APP_ENC_KEY chưa cấu hình');
    return (this.signer ??= new CursorSigner(this.intents.derive('sse-cursor')));
  }

  private db(c: Caller): Promise<TenantDb> {
    if (!this.tenants) throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'Tenant DB chưa cấu hình');
    return this.tenants.get(TenantContexts.fromMembership(c.workspaceId, c.userId));
  }

  private deps(): AssistantDeps {
    if (!this.executor || !this.runner || !this.kv) throw new AppError('NOT_IMPLEMENTED', 501, { tip: '019' }, 'AI runtime chưa cấu hình');
    const quota = this.quota;
    return { executor: this.executor, runner: this.runner, kv: this.kv, intents: this.intents, pub: this.publisher(), now: () => this.clock.now(), planKey: async (ws) => (quota ? (await quota.limits(ws)).planKey : 'free'), discovery: { models: this.discoveryModels, meter: this.meter, cache: discoveryCacheOf(this.kv, this.intents?.derive('discovery-cache')) }, storage: this.storage };
  }

  /** Tên, locale, vai trò của người gọi (system prompt + ngôn ngữ trả lời). */
  async profile(c: Caller): Promise<{ name: string; locale: string; role: string }> {
    const [u, m] = this.platform
      ? await Promise.all([
          this.platform.user.findUnique({ where: { id: c.userId }, select: { name: true, locale: true } }),
          this.platform.membership.findUnique({ where: { workspaceId_userId: { workspaceId: c.workspaceId, userId: c.userId } }, select: { roleKey: true } }),
        ])
      : [null, null];
    return { name: u?.name ?? '', locale: u?.locale ?? 'vi', role: c.authz.isOwner ? 'owner' : (m?.roleKey ?? 'member') };
  }

  /**
   * `POST /assistant/messages`. `queue` (mặc định): claim + outbox trong một transaction, ROLE=ai chạy; API chờ `done` trên sổ rồi trả
   * JSON dựng từ tin đã lưu (client SSE nối `GET /assistant/runs/:id/stream` ngay khi có run_id). `inline`: chạy trong tiến trình (test).
   */
  async turn(c: Caller, q: Omit<TurnRequest, 'ws' | 'userId' | 'authz' | 'userName' | 'locale' | 'role'>) {
    const deps = this.deps();
    const db = await this.db(c);
    const req = await this.request(c, q);
    if (this.env?.ASSISTANT_DISPATCH === 'inline' || !this.kv) return assistantTurn(deps, db, req);
    const t = await this.claim(c, q);
    if (t.kind === 'queued') await waitDone(db, this.redis(), t.run_id);
    return replayTurn(deps, db, req, t, { commands: t.kind === 'queued' });
  }

  /**
   * Bước claim của lượt (SSE: `POST /assistant/messages` + `Accept: text/event-stream`): claim + outbox → ROLE=ai chạy; controller nối
   * luồng run ngay. `inline` (không có hàng đợi) → chạy lượt trong tiến trình rồi trả run (luồng phát lại từ sổ).
   */
  async claim(c: Caller, q: Omit<TurnRequest, 'ws' | 'userId' | 'authz' | 'userName' | 'locale' | 'role'>): Promise<PreparedTurn> {
    const deps = this.deps();
    const db = await this.db(c);
    const req = await this.request(c, q);
    if (this.env?.ASSISTANT_DISPATCH === 'inline' || !this.kv) {
      const r = await assistantTurn(deps, db, req);
      return { kind: 'replay', session_id: r.session_id, run_id: r.run_id ?? '' };
    }
    const t = await prepareTurn(deps, db, { ...req, requestId: q.requestId ?? `srv-${uuidv7()}` });
    if (t.kind === 'queued') await markDirty(this.kv, c.workspaceId).catch(() => undefined);
    return t;
  }

  private async request(c: Caller, q: Omit<TurnRequest, 'ws' | 'userId' | 'authz' | 'userName' | 'locale' | 'role'>): Promise<TurnRequest> {
    const p = await this.profile(c);
    // Chỉ gửi tệp (TIP-023f §4.1): câu hỏi trung tính theo ngôn ngữ — không tự bịa việc nghiệp vụ.
    const text = q.text.trim() || (q.inputs?.length ? ATTACHMENT_ONLY[p.locale === 'en' ? 'en' : 'vi'] : q.text);
    return { ...q, text, ws: c.workspaceId, userId: c.userId, authz: c.authz, userName: p.name, locale: p.locale, role: p.role };
  }

  private redis(): Redis | null {
    const r = this.kv as Partial<Redis> | null;
    return r && typeof r.duplicate === 'function' ? (r as Redis) : null;
  }

  /** Soạn / viết lại tin Hộp thư (REQ-C05c): run consult không tool, chỉ trả bản đề xuất — không ghi nghiệp vụ, không qua meta-tools. */
  async draft(c: Caller, q: Pick<DraftRequest, 'purpose' | 'conversationId' | 'baseVersion' | 'draft' | 'instruction'>) {
    if (!this.runner) throw new AppError('NOT_IMPLEMENTED', 501, { tip: '019' }, 'AI runtime chưa cấu hình');
    const db = await this.db(c);
    const p = await this.profile(c);
    return draftReply(db, this.runner, () => this.clock.now(), { ...q, ws: c.workspaceId, userId: c.userId, authz: c.authz, userName: p.name, locale: p.locale });
  }

  /** TIP-023g §3: đề xuất combo / chiến dịch theo sản phẩm — binding `record_proposal`, run schema không tool, công bố sau khi kiểm. */
  async propose(c: Caller, raw: unknown): Promise<RecordProposalDto> {
    const ri = parseRecordIntent(raw);
    if (!isProposalIntent(ri.intent)) throw new AppError('VALIDATION_FAILED', 422, { record_intent: 'not_a_proposal' });
    const d = this.deps();
    const p = await this.profile(c);
    return proposeForRecord({ db: await this.db(c), executor: d.executor, runner: d.runner, now: d.now }, this.turnCtx(c, p, uuidv7(d.now().getTime())), ri);
  }

  /** Đọc đề xuất theo request_id của chính người gọi (không phải của người khác → 404). */
  async proposal(c: Caller, requestId: string): Promise<RecordProposalDto> {
    const d = this.deps();
    const p = await this.profile(c);
    return readProposal({ db: await this.db(c), executor: d.executor, runner: d.runner, now: d.now }, this.turnCtx(c, p, ''), requestId);
  }

  private turnCtx(c: Caller, p: { locale: string; role: string }, runId: string) {
    return { ws: c.workspaceId, runId, userId: c.userId, authz: c.authz, mode: 'chat' as const, locale: p.locale, role: p.role };
  }

  async confirm(c: Caller, q: Pick<ConfirmRequest, 'token' | 'decision'>) {
    return assistantConfirm(this.deps(), await this.db(c), { ...q, ws: c.workspaceId, userId: c.userId, authz: c.authz });
  }

  /** Sửa thẻ xem trước (REQ-E03b): chỉ xem trước lại → thẻ mới, token cũ mất hiệu lực. */
  async editPreview(c: Caller, token: string, input: Record<string, unknown>) {
    const d = this.deps();
    const p = await this.profile(c);
    return editPreview({ executor: d.executor, kv: d.kv, now: d.now }, await this.db(c), { ws: c.workspaceId, userId: c.userId, authz: c.authz, role: p.role, token, input });
  }

  async home(c: Caller) {
    return assistantHome(await this.db(c), (await this.profile(c)).locale);
  }

  /** Trình duyệt phiên (REQ-E10a): keyset theo người gọi; `cursor` / `limit` tuỳ chọn. */
  async sessions(c: Caller, q: string, page: { cursor?: string; limit?: number } = {}) {
    return listSessionsPage(await this.db(c), c.userId, { q, ...page });
  }

  /** Trang AI Agent có thể chọn làm chuyên viên Cowork (TIP-023d §5.2) — cùng service với action `assistant.agent_choices`. */
  async agentChoices(c: Caller, page: { cursor?: string; limit?: number } = {}) {
    return agentChoicesPage(await this.db(c), page);
  }

  /** `GET /assistant/sessions/:id/plan` (TIP-023d §6.1): kế hoạch mới nhất của phiên — cùng chiếu tiến độ thật với `assistant.plan_get`. */
  async sessionPlan(c: Caller, sessionId: string) {
    const db = await this.db(c);
    await ownSession(db, c.userId, sessionId);
    const found = await planOfSession(db, c.userId, sessionId);
    return found ? planToDto(found.plan, found.steps) : null;
  }

  /** `GET /assistant/input/:id` (+ `/parts`) — cùng service đọc có guard với action `assistant.attachment_get` / `_read` (TIP-023f §5.3). */
  async input(c: Caller, id: string) {
    return getArtifact(await this.db(c), c.userId, id, this.clock.now());
  }

  async inputParts(c: Caller, q: { artifact_id: string; revision: number; cursor?: string; limit?: number }) {
    return readParts(await this.db(c), c.userId, q);
  }

  async messages(c: Caller, id: string) {
    const db = await this.db(c);
    const implemented = this.executor ? implementedBy(this.executor) : () => false;
    return sessionMessages(db, c.userId, id, 100, (p) => presentUi(db, this.intents, { ws: c.workspaceId, userId: c.userId, authz: c.authz, implemented }, p));
  }

  /**
   * Replay sự kiện của run cho SSE: run phải là lượt Trợ lý của chính người gọi (không thì 404 — không lộ run người khác). Trả
   * `reset_required` khi sự kiện đã hết hạn / bị dọn (client dựng lại từ lịch sử tin, không chạy lại).
   */
  async replay(c: Caller, runId: string, afterSeq: number) {
    const db = await this.db(c);
    const run = await db.aiRun.findUnique({ where: { id: runId }, select: { kind: true, initiatedByUserId: true, status: true } });
    if (!run || run.kind !== 'assistant' || run.initiatedByUserId !== c.userId) throw new AppError('NOT_FOUND', 404, { run_id: 'not_found' });
    return { status: run.status, events: await new EventStore(db, () => this.clock.now()).after(runId, afterSeq) };
  }

  /** Giá trị `$ref` của cây đã lưu theo quyền HIỆN HÀNH (run của người khác → unavailable, không lộ tồn tại). */
  async refs(c: Caller, runId: string, refs: string[]) {
    return resolveRefs(await this.db(c), { runId, userId: c.userId, authz: c.authz, refs });
  }

  /** Vết run của chính người gọi (bộ câu thử model thật — TIP-023b R1.4). */
  async trace(c: Caller, runId: string) {
    return runTrace(await this.db(c), c.userId, runId);
  }

  async actionLogs(c: Caller, f: Omit<LogFilter, 'locale'>) {
    return listActionLogs(await this.db(c), c.authz, { ...f, locale: (await this.profile(c)).locale }, this.clock.now());
  }
}
