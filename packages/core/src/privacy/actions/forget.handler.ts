// contact.forget (TIP-015c §1.1, §1.3): preview = contact.privacy_preview lại (digest phải khớp đúng những gì đã xem lúc gọi action này
// — xem trước BẮT BUỘC qua MANDATORY_PREVIEW_ACTIONS ở policy.ts). execute = acceptForget (pha `accepted`, chưa xoá gì — cleanup chạy
// nền ở job riêng, pha sau). Không undo (irreversible) — không agentGrantable, requiredApprovalSources chặn mọi nguồn gián tiếp.
import { Inject, Injectable } from '@nestjs/common';
import type { ActionInput, ActionPreview, contactForget } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { CLOCK, type Clock } from '../../kernel/clock';
import { preview } from '../../kernel/actions/preview-kit';
import { privacyPreview, assertNoOpenBlockers } from '../services/preview';
import { acceptForget } from '../services/operation';

type Input = ActionInput<typeof contactForget>;
type Output = { operation_id: string; phase: string };

@Injectable()
@ActionHandler('contact.forget')
export class ContactForgetHandler implements Handler<Input, Output> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async preview(_ctx: ActionContext, i: Input, tx: TenantTx): Promise<ActionPreview> {
    const p = await privacyPreview(tx, i.contact_id);
    assertNoOpenBlockers(p);
    return preview('delete', `${p.canonical_contact_id} · họ ${p.family_size} khách`, {
      warnings: [`removable:${p.removable_count}`, `shared:${p.shared_count}`, `retained:${p.retained_count}`, 'irreversible'],
    });
  }

  async execute(ctx: ActionContext, i: Input, tx: TenantTx): Promise<HandlerOutcome<Output>> {
    const now = this.clock.now();
    const r = await acceptForget(tx, {
      contactId: i.contact_id,
      ifVersion: i.if_version,
      inventoryRevision: i.inventory_revision,
      requesterId: ctx.onBehalfOfUserId ?? ctx.actor.id,
      policyVersion: 1,
      now,
    });
    return { result: { operation_id: r.operationId, phase: r.phase }, events: r.events, noUndo: true };
  }
}
