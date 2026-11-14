// quote.retry_render (TIP-028b §1): PDF báo giá đã gửi render lỗi hết 3 lượt (`render_failed`) → khoá báo giá (scope ghi), báo giá còn
// `sent` / `viewed` → thế hệ render mới + outbox `document.render_requested` (job doc-render chạy lại với tham số phát hành đã chụp).
// Đang chờ / đã xong → 409. Không undo (việc nền; PDF đóng băng không gỡ).
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, quoteRetryRender } from '@appchat/actions';
import { CLOCK, type Clock } from '../../../kernel/clock';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../../kernel/actions/handler';
import { line, preview } from '../../../kernel/actions/preview-kit';
import { retryRender } from '../../../documents/public';
import { lockQuote, visibleQuote } from '../quote-access';
import { QUOTE_RENDER_KIND } from '../services/quote-render';

type In = ActionInput<typeof quoteRetryRender>;
type Out = { quote_id: string; render: 'pending_render' };

@Injectable()
@ActionHandler('quote.retry_render')
export class QuoteRetryRenderHandler implements Handler<In, Out> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: In, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const q = await lockQuote(tx, ctx.authz, input.quote_id);
    if (q.status !== 'sent' && q.status !== 'viewed') throw new AppError('INVALID_STATE', 409, { status: q.status });
    const r = await retryRender(tx, QUOTE_RENDER_KIND, q.id, this.clock.now());
    return { result: { quote_id: q.id, render: 'pending_render' }, events: r.events };
  }

  async preview(ctx: ActionContext, input: In, tx: TenantTx) {
    const q = await visibleQuote(tx, ctx.authz, input.quote_id, 'write');
    const r = await tx.documentRender.findUnique({ where: { kind_documentId: { kind: QUOTE_RENDER_KIND, documentId: q.id } }, select: { status: true } });
    return preview('write', line(q.code, `L${q.version}`), { changes: [{ entity: 'quote', id: q.id, before: { render: r?.status ?? null }, after: { render: 'pending_render' } }] });
  }
}
