// Handler action riêng của sales (TIP-003c §2): chỉ tới đây sau cổng capability của Executor (đã kiểm lại trong transaction + biên nhận
// trigger). Mục tiêu / mốc lấy từ capability đã niêm phong (không từ input tuỳ ý); mỗi discriminant một hàm hiệu ứng của domain.
import { Inject, Injectable, Optional } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, SystemOutput, invoiceSystemTransition, packageSystemTransition, quoteSystemTransition } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { CLOCK, type Clock } from '../../kernel/clock';
import { systemCapabilityOf } from '../../kernel/actions/system';
import { ChannelSendQueue } from '../../channels/public';
import { CrmMembers } from '../../crm/public';
import { enqueueOutgoing } from '../../inbox/public';
import { QuoteDeps } from '../quotes/services/quote-deps';
import { expireQuote, recordView, remindQuote, type Effect } from './quote-effects';
import { expirePackage, grantOnConfirm, markInvoiceOverdue, remindInvoice, remindRemainingPackage } from './payment-effects';

/** Capability đã niêm phong phải trỏ đúng mục tiêu của input (Executor đã kiểm digest; đây là phòng thủ kép theo id). */
export function boundTarget(ctx: ActionContext, entityId: string): { milestone: string } {
  const cap = systemCapabilityOf(ctx);
  if (!cap || cap.targetId !== entityId) throw new AppError('FORBIDDEN', 403, { capability: 'missing' });
  return { milestone: cap.milestone };
}

const outcome = (e: Effect, afterCommit?: () => Promise<void>): HandlerOutcome<SystemOutput> => ({ result: e.out, events: e.events, noUndo: true, ...(afterCommit ? { afterCommit } : {}) });

@Injectable()
@ActionHandler('quote.system_transition')
export class QuoteSystemTransitionHandler implements Handler<ActionInput<typeof quoteSystemTransition>, SystemOutput> {
  constructor(
    @Inject(QuoteDeps) private readonly d: QuoteDeps,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async preview(): Promise<never> {
    throw new AppError('FORBIDDEN', 403, { capability: 'internal' });
  }

  async execute(ctx: ActionContext, i: ActionInput<typeof quoteSystemTransition>, tx: TenantTx): Promise<HandlerOutcome<SystemOutput>> {
    boundTarget(ctx, i.entity_id);
    const now = this.clock.now();
    if (i.operation === 'record_view') return outcome(await recordView(tx, i.entity_id, now));
    if (i.operation === 'expire') return outcome(await expireQuote(tx, i.entity_id, now));
    return outcome(await remindQuote(tx, i.entity_id, now, (await this.d.place(ctx.workspaceId)).timeZone));
  }
}

@Injectable()
@ActionHandler('invoice.system_transition')
export class InvoiceSystemTransitionHandler implements Handler<ActionInput<typeof invoiceSystemTransition>, SystemOutput> {
  constructor(
    @Inject(QuoteDeps) private readonly d: QuoteDeps,
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Optional() @Inject(ChannelSendQueue) private readonly queue: ChannelSendQueue | null,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async preview(): Promise<never> {
    throw new AppError('FORBIDDEN', 403, { capability: 'internal' });
  }

  async execute(ctx: ActionContext, i: ActionInput<typeof invoiceSystemTransition>, tx: TenantTx): Promise<HandlerOutcome<SystemOutput>> {
    const { milestone } = boundTarget(ctx, i.entity_id);
    const now = this.clock.now();
    const tz = (await this.d.place(ctx.workspaceId)).timeZone;
    if (i.operation === 'overdue') return outcome(await markInvoiceOverdue(tx, i.entity_id, now, tz));
    const r = await remindInvoice(ctx, tx, { quotes: this.d, members: this.members }, i.entity_id, milestone, now, tz);
    // Tin đã ghi bền trong transaction (outbox_message); đẩy hàng gửi sau commit — lỗi đẩy có quét lại của kênh.
    return outcome(r, r.outgoing ? () => enqueueOutgoing(this.queue, ctx.workspaceId, r.outgoing!) : undefined);
  }
}

@Injectable()
@ActionHandler('package.system_transition')
export class PackageSystemTransitionHandler implements Handler<ActionInput<typeof packageSystemTransition>, SystemOutput> {
  constructor(
    @Inject(QuoteDeps) private readonly d: QuoteDeps,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async preview(): Promise<never> {
    throw new AppError('FORBIDDEN', 403, { capability: 'internal' });
  }

  async execute(ctx: ActionContext, i: ActionInput<typeof packageSystemTransition>, tx: TenantTx): Promise<HandlerOutcome<SystemOutput>> {
    boundTarget(ctx, i.entity_id);
    const now = this.clock.now();
    if (i.operation === 'grant_on_confirm') return outcome(await grantOnConfirm(tx, i.entity_id, now));
    if (i.operation === 'remind_remaining') return outcome(await remindRemainingPackage(tx, i.entity_id, now, (await this.d.place(ctx.workspaceId)).timeZone));
    return outcome(await expirePackage(tx, i.entity_id, now));
  }
}

export const SALES_SYSTEM_HANDLERS = [QuoteSystemTransitionHandler, InvoiceSystemTransitionHandler, PackageSystemTransitionHandler];
