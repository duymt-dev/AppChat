// Handler action riêng `channel.system_transition` (TIP-003c §2): chỉ tới đây sau cổng capability + biên nhận trigger. Lần đăng nhập /
// thế hệ phiên lấy từ capability đã niêm phong; route nền tảng (045b) cập nhật sau commit (idempotent theo trạng thái tài khoản).
import { Inject, Injectable, Optional } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { AppError } from '@appchat/shared';
import type { ActionInput, SystemOutput, channelSystemTransition } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { systemCapabilityOf } from '../../kernel/actions/system';
import { CLOCK, type Clock } from '../../kernel/clock';
import { REDIS } from '../../kernel/redis';
import { ChannelAccounts } from '../services/accounts.service';
import { commitLogin, markUnavailable } from './effects';
import { takeDownDetail, takeStagedLogin } from './staging';

@Injectable()
@ActionHandler('channel.system_transition')
export class ChannelSystemTransitionHandler implements Handler<ActionInput<typeof channelSystemTransition>, SystemOutput> {
  constructor(
    @Optional() @Inject(ChannelAccounts) private readonly accounts: ChannelAccounts | null,
    @Optional() @Inject(REDIS) private readonly redis: Redis | undefined,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async preview(): Promise<never> {
    throw new AppError('FORBIDDEN', 403, { capability: 'internal' });
  }

  async execute(ctx: ActionContext, i: ActionInput<typeof channelSystemTransition>, tx: TenantTx): Promise<HandlerOutcome<SystemOutput>> {
    const cap = systemCapabilityOf(ctx);
    if (!cap || cap.targetId !== i.entity_id) throw new AppError('FORBIDDEN', 403, { capability: 'missing' });
    const accounts = this.accounts;
    if (!accounts) throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'PlatformDb chưa cấu hình');
    const now = this.clock.now();
    const e =
      i.operation === 'commit_login_result'
        ? await commitLogin(tx, accounts, i.entity_id, this.redis ? await takeStagedLogin(this.redis, i.entity_id, cap.generation) : null, now)
        : await markUnavailable(tx, accounts, i.entity_id, i.operation === 'mark_expired' ? 'expired' : 'send_errors', Number(cap.generation), this.redis ? await takeDownDetail(this.redis, i.entity_id, Number(cap.generation)) : undefined, now);
    const route = e.route;
    return { result: e.out, events: e.events, noUndo: true, ...(route ? { afterCommit: () => accounts.route(ctx.workspaceId, route.row, route.status) } : {}) };
  }
}
