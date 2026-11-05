// workspace.transfer_ownership (db platform, config, chỉ UI — TIP-045b annex A3, rbac §7): Owner hiện tại nhập mã email → đổi Owner nguyên
// tử (Owner cũ → manager), tăng phiên bản quyền cùng commit; cả hai nhận thông báo + làm mới quyền socket. Không hoàn tác chung: đổi lại
// là một lần chuyển có OTP khác của Owner mới. Sai mã: đếm lần sai ở transaction riêng (không bị rollback cùng thao tác).
import { Inject, Injectable, Optional } from '@nestjs/common';
import type { PlatformDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { ActionInput, workspaceTransferOwnership } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, PlatformTx, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { preview, updated } from '../../kernel/actions/preview-kit';
import { PLATFORM_DB } from '../../kernel/tenant/tenant.providers';
import { needPlatform, userName } from './previews/platform-read';
import { PREVIOUS_OWNER_ROLE, transferOwnership } from '../services/ownership-transfer';
import { ownerUiOnly } from './workspace-transfer-otp.handler';

type Input = ActionInput<typeof workspaceTransferOwnership>;
type Output = { owner_user_id: string; previous_owner_role: 'manager' };

@Injectable()
@ActionHandler('workspace.transfer_ownership')
export class WorkspaceTransferOwnershipHandler implements Handler<Input, Output> {
  constructor(
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | undefined,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: Input, _tx: TenantTx, ptx?: PlatformTx): Promise<HandlerOutcome<Output>> {
    if (!ptx || !this.platform) throw new AppError('INTERNAL', 500, undefined, 'workspace.transfer_ownership cần PlatformTx');
    const me = ownerUiOnly(ctx);
    const db = this.platform;
    const r = await transferOwnership(ptx, ctx.workspaceId, me, input, this.clock.now(), ctx.operationId, async (id) => {
      await db.ownerTransferOtp.update({ where: { id }, data: { attempts: { increment: 1 } } });
    });
    const [from, to] = await Promise.all([ptx.user.findUnique({ where: { id: r.previousOwner }, select: { name: true } }), ptx.user.findUnique({ where: { id: r.newOwner }, select: { name: true } })]);
    return {
      result: { owner_user_id: r.newOwner, previous_owner_role: PREVIOUS_OWNER_ROLE },
      before: { owner_user_id: r.previousOwner, target_role: r.previousTargetRole },
      after: { owner_user_id: r.newOwner, previous_owner_role: PREVIOUS_OWNER_ROLE, authz_epoch: r.epoch },
      events: [
        { topic: 'member.role_changed', payload: { user_id: r.previousOwner, role_key: PREVIOUS_OWNER_ROLE } },
        { topic: 'member.role_changed', payload: { user_id: r.newOwner, role_key: 'owner' } },
        { topic: 'notify.requested', payload: { kind: 'owner_transfer', to: { user_ids: [r.previousOwner, r.newOwner] }, params: { from: from?.name ?? '', to: to?.name ?? '' }, link: '/settings/members' } },
      ],
    };
  }

  async preview(ctx: ActionContext, input: Input) {
    const p = needPlatform(this.platform, 'workspace.transfer_ownership');
    const ws = await p.workspace.findUniqueOrThrow({ where: { id: ctx.workspaceId }, select: { ownerUserId: true } });
    const u = await userName(p, input.to_user_id);
    return preview('config', u.name, { changes: updated('workspace', ctx.workspaceId, { owner_user_id: ws.ownerUserId }, { owner_user_id: input.to_user_id }) });
  }
}
