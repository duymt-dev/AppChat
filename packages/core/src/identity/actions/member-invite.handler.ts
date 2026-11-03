// member.invite (db platform, members.manage, risk send → Idempotency-Key) — Cài đặt › Thành viên › Mời thành viên.
// Hạn mức `users` của gói = thành viên active + lời mời còn chờ (trừ lời mời cũ cùng email sẽ bị thay) — vượt → 402
// PLAN_LIMIT_REACHED (TIP-009). Lời mời + thư gửi trong PlatformTx: thư lỗi → không có lời mời mồ côi.
import { Inject, Injectable, Optional } from '@nestjs/common';
import type { PlatformDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { ActionInput, memberInvite } from '@appchat/actions';
import { QuotaService } from '../../billing/public';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, PlatformTx, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { needPlatform } from './previews/platform-read';
import { invitePreview } from './previews/member-invite.handler.preview';
import { PLATFORM_DB } from '../../kernel/tenant/tenant.providers';
import { InvitesService } from '../services/invites.service';

type Input = ActionInput<typeof memberInvite>;

@Injectable()
@ActionHandler('member.invite')
export class MemberInviteHandler implements Handler<Input, { invite_id: string }> {
  constructor(
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | undefined,
    @Inject(InvitesService) private readonly invites: InvitesService | null,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: Input, _tx: TenantTx, ptx?: PlatformTx): Promise<HandlerOutcome<{ invite_id: string }>> {
    if (!ptx || !this.invites) throw new AppError('INTERNAL', 500, undefined, 'member.invite cần PlatformTx + InvitesService');
    const ws = ctx.workspaceId;
    // Khoá workspace: hai lời mời song song không cùng lọt qua kiểm hạn mức.
    await ptx.$queryRaw`SELECT id FROM workspace WHERE id = ${ws}::uuid FOR UPDATE`;
    const members = await ptx.membership.count({ where: { workspaceId: ws, status: 'active' } });
    const pending = await this.invites.pendingCount(ws, this.clock.now(), ptx, input.email);
    // QuotaService chỉ đọc subscription / plan — dựng trên ptx (cùng transaction, không kéo BillingModule vào identity).
    await new QuotaService(ptx).assert(ws, 'users', members + pending);
    const { inviteId } = await this.invites.create(ws, ctx.actor.id, input, ptx);
    return { result: { invite_id: inviteId }, after: { invite_id: inviteId, role: input.role } };
  }

  async preview(ctx: ActionContext, input: Input) {
    return invitePreview(needPlatform(this.platform, 'member.invite'), ctx.workspaceId, input, this.clock.now());
  }
}
