// privacy.review_resolve (TIP-015c §1.3 point 5, pha 2): người xét (privacy.erase) quyết định một mục quarantine — xem trước bắt
// buộc (MANDATORY_PREVIEW_ACTIONS ở policy.ts) như contact.forget, không undo (quyết định không đảo ngược qua action này).
import { Inject, Injectable } from '@nestjs/common';
import type { ActionInput, ActionPreview, privacyReviewResolve } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { CLOCK, type Clock } from '../../kernel/clock';
import { preview } from '../../kernel/actions/preview-kit';
import { reviewResolve, reviewResolvePreview } from '../services/review';

type Input = ActionInput<typeof privacyReviewResolve>;
type Output = { item_id: string; disposition: string };

@Injectable()
@ActionHandler('privacy.review_resolve')
export class PrivacyReviewResolveHandler implements Handler<Input, Output> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async preview(_ctx: ActionContext, i: Input, tx: TenantTx): Promise<ActionPreview> {
    const p = await reviewResolvePreview(tx, i.operation_id, i.item_id);
    return preview('delete', `${p.domain}:${p.kind} · ${p.ownership}`, { warnings: [`disposition:${i.disposition}`] });
  }

  async execute(_ctx: ActionContext, i: Input, tx: TenantTx): Promise<HandlerOutcome<Output>> {
    const r = await reviewResolve(tx, { operationId: i.operation_id, itemId: i.item_id, ifVersion: i.if_version, disposition: i.disposition, proofRef: i.proof_ref }, this.clock.now());
    return { result: { item_id: r.itemId, disposition: r.disposition }, noUndo: true };
  }
}
