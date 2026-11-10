// Handler action riêng `appointment.system_transition` (TIP-003c §2): chỉ tới đây sau cổng capability + biên nhận trigger của Executor.
import { Inject, Injectable, Optional } from '@nestjs/common';
import type { PlatformDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { ActionInput, SystemOutput, appointmentSystemTransition } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { systemCapabilityOf } from '../../kernel/actions/system';
import { CLOCK, type Clock } from '../../kernel/clock';
import { PLATFORM_DB } from '../../kernel/tenant/tenant.providers';
import { ChannelSendQueue } from '../../channels/public';
import { CrmMembers } from '../../crm/public';
import { businessData } from '../../documents/public';
import { enqueueOutgoing } from '../../inbox/public';
import { expireHold, remindAppointment } from './effects';

@Injectable()
@ActionHandler('appointment.system_transition')
export class AppointmentSystemTransitionHandler implements Handler<ActionInput<typeof appointmentSystemTransition>, SystemOutput> {
  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Optional() @Inject(ChannelSendQueue) private readonly queue: ChannelSendQueue | null,
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | undefined,
  ) {}

  async preview(): Promise<never> {
    throw new AppError('FORBIDDEN', 403, { capability: 'internal' });
  }

  async execute(ctx: ActionContext, i: ActionInput<typeof appointmentSystemTransition>, tx: TenantTx): Promise<HandlerOutcome<SystemOutput>> {
    const cap = systemCapabilityOf(ctx);
    if (!cap || cap.targetId !== i.entity_id) throw new AppError('FORBIDDEN', 403, { capability: 'missing' });
    if (!this.platform) throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'PlatformDb chưa cấu hình');
    const now = this.clock.now();
    const place = await businessData(this.platform, ctx.workspaceId);
    const e = i.operation === 'expire_hold' ? await expireHold(tx, i.entity_id, now, place.timeZone) : await remindAppointment(ctx, tx, this.members, place, i.entity_id, cap.milestone, now);
    const out = e.outgoing;
    return { result: e.out, events: e.events, noUndo: true, ...(out ? { afterCommit: () => enqueueOutgoing(this.queue, ctx.workspaceId, out) } : {}) };
  }
}
