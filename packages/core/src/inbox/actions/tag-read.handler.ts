// tag.search (TIP-023b R2 · DC-224): tra thẻ theo tên để có id cho action gắn thẻ. Danh mục chung workspace (không data scope).
import { Injectable } from '@nestjs/common';
import { foldText } from '@appchat/shared';
import type { ActionInput, tagSearch } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';

type TagOut = { tags: { id: string; name: string; scope: string }[] };

@Injectable()
@ActionHandler('tag.search')
export class TagSearchHandler implements Handler<ActionInput<typeof tagSearch>, TagOut> {
  async execute(_ctx: ActionContext, i: ActionInput<typeof tagSearch>, tx: TenantTx): Promise<HandlerOutcome<TagOut>> {
    // Danh mục thẻ nhỏ (vài chục / workspace) — lọc bỏ dấu sau khi đọc, như Cài đặt › Thẻ.
    const f = foldText(i.q ?? '');
    const rows = await tx.tag.findMany({ orderBy: { name: 'asc' }, take: 500, select: { id: true, name: true, scope: true } });
    return { result: { tags: rows.filter((t) => !f || foldText(t.name).includes(f)).slice(0, i.limit ?? 10) } };
  }
}
