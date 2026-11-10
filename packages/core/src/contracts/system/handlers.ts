// Handler action riêng `contract.system_transition` (TIP-003c §2): chỉ tới đây sau cổng capability + biên nhận trigger của Executor.
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, SystemOutput, contractSystemTransition } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { systemCapabilityOf } from '../../kernel/actions/system';
import { CLOCK, type Clock } from '../../kernel/clock';
import { ContractDeps } from '../services/contract-deps';
import { expireContract, expireLink, renewalNotice } from './effects';

@Injectable()
@ActionHandler('contract.system_transition')
export class ContractSystemTransitionHandler implements Handler<ActionInput<typeof contractSystemTransition>, SystemOutput> {
  constructor(
    @Inject(ContractDeps) private readonly d: ContractDeps,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async preview(): Promise<never> {
    throw new AppError('FORBIDDEN', 403, { capability: 'internal' });
  }

  async execute(ctx: ActionContext, i: ActionInput<typeof contractSystemTransition>, tx: TenantTx): Promise<HandlerOutcome<SystemOutput>> {
    const cap = systemCapabilityOf(ctx);
    if (!cap || cap.targetId !== i.entity_id) throw new AppError('FORBIDDEN', 403, { capability: 'missing' });
    const now = this.clock.now();
    const place = await this.d.place(ctx.workspaceId);
    const e =
      i.operation === 'expire_link' ? await expireLink(tx, i.entity_id, now, place.locale)
      : i.operation === 'renewal_notice' ? await renewalNotice(tx, i.entity_id, now, place.timeZone)
      : await expireContract(tx, i.entity_id, now, place.timeZone);
    return { result: e.out, events: e.events, noUndo: true };
  }
}
