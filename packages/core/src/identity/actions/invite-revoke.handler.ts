// invite.revoke (db platform, members.manage) — Cài đặt › Thành viên › Thu hồi lời mời đang chờ; không còn chờ → 404.
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, inviteRevoke } from '@appchat/actions';
import type { ActionContext, PlatformTx, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { UUID_V7 } from '../../kernel/ids';
import { InvitesService } from '../services/invites.service';

type Input = ActionInput<typeof inviteRevoke>;

@Injectable()
@ActionHandler('invite.revoke')
export class InviteRevokeHandler implements Handler<Input, { ok: boolean }> {
  constructor(@Inject(InvitesService) private readonly invites: InvitesService | null) {}

  async execute(ctx: ActionContext, input: Input, _tx: TenantTx, ptx?: PlatformTx): Promise<HandlerOutcome<{ ok: boolean }>> {
    if (!ptx || !this.invites) throw new AppError('INTERNAL', 500, undefined, 'invite.revoke cần PlatformTx + InvitesService');
    if (!UUID_V7.test(input.invite_id)) throw new AppError('NOT_FOUND', 404, { invite_id: 'not_found' });
    await this.invites.revoke(ctx.workspaceId, input.invite_id, ptx);
    return { result: { ok: true }, before: { invite_id: input.invite_id, status: 'pending' }, after: { invite_id: input.invite_id, status: 'revoked' } };
  }
}
