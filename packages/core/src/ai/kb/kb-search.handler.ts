// `kb.search` (read, agentGrantable, Kỹ năng AI): tìm kết hợp trong kho (search.ts). Visibility theo người hiệu lực (rag §3, D54):
// có `kb.manage` (hoặc Owner) → `public` + `internal`; còn lại → chỉ `public`. Agent trực kênh trả lời khách (source agent, không
// người ra lệnh) → chỉ `public`; phạm vi thư mục / thẻ của agent (`kb_scope`) do TIP-021 / 022 truyền qua `searchKb` trực tiếp.
import { Inject, Injectable } from '@nestjs/common';
import type { Embedder } from '@appchat/ai';
import type { ActionInput, ActionPreview, kbSearch } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { kbVisibility, searchPreview } from './previews/kb-search.handler.preview';
import { searchKb, type KbSearchResult } from './search';

export const KB_EMBEDDER = Symbol('KB_EMBEDDER');

type Out = Pick<KbSearchResult, 'grounded' | 'chunks' | 'citations'>;

export { kbVisibility };

@Injectable()
@ActionHandler('kb.search')
export class KbSearchHandler implements Handler<ActionInput<typeof kbSearch>, Out> {
  constructor(@Inject(KB_EMBEDDER) private readonly embedder: Embedder | null) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof kbSearch>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const r = await searchKb(tx, this.embedder, { query: input.query, visibility: kbVisibility(ctx), ...(input.limit ? { limit: input.limit } : {}) });
    return { result: { grounded: r.grounded, chunks: r.chunks, citations: r.citations } };
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof kbSearch>): Promise<ActionPreview> {
    return searchPreview(ctx, input);
  }
}
