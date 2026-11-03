// quote.submit_for_approval · approve · reject_internal (COMMERCE §3: chỉ duyệt khi chạm ngưỡng — tổng > 20tr, giảm > 5%, hàng ngoài
// danh mục do AI / agent tạo). Gửi duyệt thông báo người có `quote.approve` (`quote_approval`); từ chối nội bộ trả về nháp, lý do ghi
// thành trao đổi nội bộ. Chuyển trạng thái theo QUOTE_FLOW + UPDATE có điều kiện trạng thái (concurrency §2).
import { Inject, Injectable } from '@nestjs/common';
import { QUOTE_FLOW, assertTransition } from '@appchat/shared';
import type { ActionInput, quoteApprove, quoteRejectInternal, quoteSubmit } from '@appchat/actions';
import { CLOCK, type Clock } from '../../../kernel/clock';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../../kernel/actions/handler';
import { uuidv7 } from '../../../kernel/ids';
import { CrmMembers, actorUserId } from '../../../crm/public';
import { lockQuote } from '../quote-access';
import { moveStatus } from '../services/quote-write';
import { approvePreview, rejectInternalPreview, submitPreview } from '../previews/quote-approval.handlers.preview';

type Out = { quote_id: string; status: string };
const cut = (s: string) => s.slice(0, 200);

@Injectable()
@ActionHandler('quote.submit_for_approval')
export class QuoteSubmitHandler implements Handler<ActionInput<typeof quoteSubmit>, Out> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof quoteSubmit>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const q = await lockQuote(tx, ctx.authz, input.quote_id);
    const to = assertTransition(QUOTE_FLOW, q.status, 'quote.submit_for_approval');
    await moveStatus(tx, q, to, {}, this.clock.now());
    const me = actorUserId(ctx);
    const [actor, contact] = await Promise.all([
      me ? this.members.names([me]).then((m) => m.get(me) ?? '') : Promise.resolve(''),
      tx.contact.findUnique({ where: { id: q.contactId }, select: { name: true } }),
    ]);
    return {
      result: { quote_id: q.id, status: to },
      events: [
        {
          topic: 'notify.requested',
          payload: {
            kind: 'quote_approval',
            to: { permission: 'quote.approve' },
            params: { actor: cut(actor), code: q.code, contact: cut(contact?.name ?? '') },
            link: `/quotes?q=${q.id}`,
            ...(me ? { exclude_user_id: me } : {}),
          },
        },
      ],
    };
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof quoteSubmit>, tx: TenantTx) {
    return submitPreview(ctx, tx, input);
  }
}

@Injectable()
@ActionHandler('quote.approve')
export class QuoteApproveHandler implements Handler<ActionInput<typeof quoteApprove>, Out> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof quoteApprove>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const q = await lockQuote(tx, ctx.authz, input.quote_id);
    const to = assertTransition(QUOTE_FLOW, q.status, 'quote.approve');
    await moveStatus(tx, q, to, { approvedBy: actorUserId(ctx) }, this.clock.now());
    return { result: { quote_id: q.id, status: to } };
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof quoteApprove>, tx: TenantTx) {
    return approvePreview(ctx, tx, input);
  }
}

@Injectable()
@ActionHandler('quote.reject_internal')
export class QuoteRejectInternalHandler implements Handler<ActionInput<typeof quoteRejectInternal>, Out> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof quoteRejectInternal>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const q = await lockQuote(tx, ctx.authz, input.quote_id);
    const to = assertTransition(QUOTE_FLOW, q.status, 'quote.reject_internal');
    const now = this.clock.now();
    await moveStatus(tx, q, to, { approvedBy: null }, now);
    const reason = input.reason?.trim();
    if (reason) await tx.quoteComment.create({ data: { id: uuidv7(now.getTime()), quoteId: q.id, authorId: actorUserId(ctx), body: reason, createdAt: now } });
    return { result: { quote_id: q.id, status: to } };
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof quoteRejectInternal>, tx: TenantTx) {
    return rejectInternalPreview(ctx, tx, input);
  }
}
