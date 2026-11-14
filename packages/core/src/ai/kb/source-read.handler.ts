// kb.source_search (TIP-023b R2 · DC-224): tra nguồn tri thức theo tên / thẻ để có id cho action kb.*. Quyền như màn Dữ liệu RAG
// (kb.manage); không trả nội dung tài liệu / URL / tệp. Danh mục nhỏ — lọc bỏ dấu sau khi đọc trang giới hạn. ≤ 20 dòng.
import { Injectable } from '@nestjs/common';
import { foldText } from '@appchat/shared';
import type { ActionInput, kbSourceSearch } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';

const MAX_SCAN = 500;
const has = (needle: string, ...xs: (string | null | undefined)[]) => !needle || xs.some((x) => !!x && foldText(x).includes(needle));

type KbOut = { sources: { id: string; name: string; kind: string; status: string; visibility: string; tags: string[] }[] };

@Injectable()
@ActionHandler('kb.source_search')
export class KbSourceSearchHandler implements Handler<ActionInput<typeof kbSourceSearch>, KbOut> {
  async execute(_ctx: ActionContext, i: ActionInput<typeof kbSourceSearch>, tx: TenantTx): Promise<HandlerOutcome<KbOut>> {
    const f = foldText(i.q ?? '');
    const rows = await tx.kbSource.findMany({
      where: { deletedAt: null, ...(i.status ? { status: i.status } : {}) },
      orderBy: { createdAt: 'desc' },
      take: MAX_SCAN,
      select: { id: true, name: true, kind: true, status: true, visibility: true, tags: true },
    });
    return { result: { sources: rows.filter((s) => has(f, s.name, ...s.tags)).slice(0, i.limit ?? 10) } };
  }
}
