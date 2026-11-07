// `kb.search` (read, agentGrantable, Kỹ năng AI): tìm kết hợp trong kho (search.ts). Visibility theo người hiệu lực (rag §3, D54):
// có `kb.manage` (hoặc Owner) → `public` + `internal`; còn lại → chỉ `public`. Agent trực kênh trả lời khách (source agent, không
// người ra lệnh) → chỉ `public`; phạm vi thư mục / thẻ của agent (`kb_scope`) do TIP-021 / 022 truyền qua `searchKb` trực tiếp.
// TIP-019b §3.2: embedding câu hỏi chạy ở `prepare` (NGOÀI transaction), có đo — trong một run thì trừ vào run đó (gốc tin cậy từ
// ActionContext), gọi trực tiếp thì một run gốc riêng; truy vấn kho theo scope hiện tại chạy ngắn trong transaction của `execute`.
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
import { searchKb, type KbSearchResult } from './search';
import { queryRunFor } from './query-run';

export const KB_EMBEDDER = Symbol('KB_EMBEDDER');

type Out = Pick<KbSearchResult, 'grounded' | 'chunks' | 'citations'>;

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

  /** Embed câu hỏi có đo, ngoài transaction. Lỗi ngân sách / ví / usage không rõ ném ra; không có route embed → nhánh từ khoá. */
  async prepare(ctx: ActionContext, input: ActionInput<typeof kbSearch>): Promise<EmbedResult | null> {
    if (!this.embedder) return null;
    if (!this.tenants || !this.meter?.usage) return this.embedder.embed([input.query]);
    const db = await this.tenants.get(TenantContexts.system(ctx.workspaceId, 'kb.search'));
    return queryRunFor({ db, embedder: this.embedder, meter: this.meter, now: () => this.clock?.now() ?? new Date() }, ctx, input.query);
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof kbSearch>, tx: TenantTx, _ptx?: unknown, prepared?: unknown): Promise<HandlerOutcome<Out>> {
    const pre = (prepared ?? null) as EmbedResult | null;
    const r = await searchKb(tx, pre ? null : this.embedder, { query: input.query, visibility: kbVisibility(ctx), ...(input.limit ? { limit: input.limit } : {}), queryEmbedding: pre });
    return { result: { grounded: r.grounded, chunks: r.chunks, citations: r.citations } };
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof kbSearch>): Promise<ActionPreview> {
    return searchPreview(ctx, input);
  }
}
