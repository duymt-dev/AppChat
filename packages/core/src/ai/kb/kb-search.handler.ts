// `kb.search` (read, agentGrantable, Kỹ năng AI): tìm kết hợp trong kho (search.ts) dưới restriction tin cậy (TIP-020c — scope/resolve.ts):
// Trợ lý → quyền nguồn hiện hành của người hỏi; agent → phạm vi nhận ∧ phạm vi bản đang xuất bản ∧ (kênh: public | làm cho người: quyền
// người ra lệnh); chat thử Builder → phạm vi nháp dưới quyền người thử. Phạm vi rỗng / không có binding → không căn cứ, KHÔNG gọi embed.
// TIP-019b §3.2: embedding câu hỏi chạy ở `prepare` (NGOÀI transaction), có đo — trong một run thì trừ vào run đó (gốc tin cậy từ
// ActionContext), gọi trực tiếp thì một run gốc riêng; truy vấn kho theo restriction nhận lại chạy ngắn trong transaction của `execute`.
import { Inject, Injectable, Optional } from '@nestjs/common';
import type { EmbedResult, Embedder } from '@appchat/ai';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import type { ActionInput, ActionPreview, kbSearch } from '@appchat/actions';
import { CreditMeter } from '../../billing/services/credit-meter';
import { CLOCK, type Clock } from '../../kernel/clock';
import { TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { kbVisibility, searchPreview } from './previews/kb-search.handler.preview';
import { emptyResult, minScoreOf, searchKb, type KbSearchResult } from './search';
import { queryRunFor } from './query-run';
import { recordRefs } from './scope/provenance';
import { resolveFor } from './scope/resolve';

export const KB_EMBEDDER = Symbol('KB_EMBEDDER');

type Out = Pick<KbSearchResult, 'grounded' | 'chunks' | 'citations'>;
/** Kết quả `prepare`: bị chặn (lý do an toàn) hoặc vector đã đo (null = nhánh từ khoá). */
type Prepared = { denied: string } | { e: EmbedResult | null };

const pick = (r: KbSearchResult): Out => ({ grounded: r.grounded, chunks: r.chunks, citations: r.citations });

export { kbVisibility };

@Injectable()
@ActionHandler('kb.search')
export class KbSearchHandler implements Handler<ActionInput<typeof kbSearch>, Out> {
  constructor(
    @Inject(KB_EMBEDDER) private readonly embedder: Embedder | null,
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver | null = null,
    @Optional() @Inject(CreditMeter) private readonly meter: CreditMeter | null = null,
    @Optional() @Inject(CLOCK) private readonly clock: Clock | null = null,
  ) {}

  /** Nhận phạm vi TRƯỚC khi gọi nhà cung cấp embed: bị chặn → không embed, không trừ credit. Lỗi ngân sách / ví / usage không rõ ném ra. */
  async prepare(ctx: ActionContext, input: ActionInput<typeof kbSearch>): Promise<Prepared> {
    if (!this.tenants) return { e: null };
    const db = await this.tenants.get(TenantContexts.system(ctx.workspaceId, 'kb.search'));
    const r = await resolveFor(db, ctx);
    if (!r.admission.ok) return { denied: r.admission.reason };
    if (!this.embedder) return { e: null };
    if (!this.meter?.usage) return { e: await this.embedder.embed([input.query]) };
    return { e: await queryRunFor({ db, embedder: this.embedder, meter: this.meter, now: () => this.clock?.now() ?? new Date() }, ctx, input.query) };
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof kbSearch>, tx: TenantTx, _ptx?: unknown, prepared?: unknown): Promise<HandlerOutcome<Out>> {
    const pre = (prepared ?? { e: null }) as Prepared;
    if ('denied' in pre) return { result: pick(emptyResult(await minScoreOf(tx))) };
    // Nhận lại trong transaction ngắn sau embed: thu hồi / đổi phạm vi giữa hai bước → không đưa nội dung cho model.
    const r = await resolveFor(tx, ctx);
    if (!r.admission.ok) return { result: pick(emptyResult(await minScoreOf(tx))) };
    const out = await searchKb(tx, null, { query: input.query, restriction: r.admission.r, ...(input.limit ? { limit: input.limit } : {}), queryEmbedding: pre.e });
    if (r.bindingRunId && ctx.runId) await recordRefs(tx, ctx.runId, out.refs.map((x) => ({ ...x, b: r.bindingRunId! })));
    return { result: pick(out) };
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof kbSearch>): Promise<ActionPreview> {
    return searchPreview(ctx, input);
  }
}
