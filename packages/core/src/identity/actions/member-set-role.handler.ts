// member.set_role (db platform, members.manage, hoàn tác 24h) — Cài đặt › Thành viên › Sửa. Owner (`workspace.owner_user_id`) khoá;
// đổi `membership.role_key` → event `member.role_changed` (TIP-006: làm mới cache quyền + báo socket người đó).
// Hoàn tác = thao tác nền tảng mới có điều kiện (kernel/consistency/undo-operation — TIP-045b), không ghi PlatformDb từ tx tenant.
import { Inject, Injectable, Optional } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, memberSetRole } from '@appchat/actions';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, PlatformTx, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { needPlatform } from './previews/platform-read';
import { setRolePreview } from './previews/member-set-role.handler.preview';
import { bumpAuthzEpoch } from '../../kernel/consistency/handler-adapter';
import { PLATFORM_DB, TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import { activeMember } from './member-guard';
import { assertAssignable, assignableRole } from '../../authz/services/role-assignment';

type Input = ActionInput<typeof memberSetRole>;
type Output = { user_id: string; role: string };

@Injectable()
@ActionHandler('member.set_role')
export class MemberSetRoleHandler implements Handler<Input, Output> {
  constructor(
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | undefined,
    @Inject(CLOCK) private readonly clock: Clock,
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver | undefined,
  ) {}

  async execute(ctx: ActionContext, input: Input, tx: TenantTx, ptx?: PlatformTx): Promise<HandlerOutcome<Output>> {
    if (!ptx) throw new AppError('INTERNAL', 500, undefined, 'member.set_role cần PlatformTx');
    // TIP-042: vai trò đích còn sống + không vượt quyền người gán; người gán không tự đổi vai trò của chính mình (tự nâng / tự hạ khoá).
    await assertAssignable(tx, ctx.authz, input.role);
    if (input.user_id === ctx.actor.id && !ctx.authz.isOwner) throw new AppError('FORBIDDEN', 403, { user_id: 'self' });
    const m = await activeMember(ptx, ctx.workspaceId, input.user_id);
    await ptx.membership.update({ where: { workspaceId_userId: { workspaceId: ctx.workspaceId, userId: m.userId } }, data: { roleKey: input.role } });
    // Phiên bản quyền tăng CÙNG transaction (TIP-045b): quyền cũ trong cache hết hiệu lực ngay cả khi relay / Redis chậm.
    if (m.roleKey !== input.role) await bumpAuthzEpoch(ptx, ctx.workspaceId);
    return {
      result: { user_id: m.userId, role: input.role },
      before: { user_id: m.userId, role: m.roleKey },
      after: { user_id: m.userId, role: input.role },
      events: m.roleKey === input.role ? [] : [{ topic: 'member.role_changed', payload: { user_id: m.userId, role_key: input.role } }],
    };
  }

  /**
   * Hoàn tác = thao tác nền tảng MỚI có điều kiện (TIP-045b): chỉ khi vai trò hiện tại vẫn là vai trò đã đặt và thành viên còn active;
   * tăng phiên bản quyền cùng transaction; event ghi outbox tenant cùng lần đánh dấu undone.
   */
  async undoPlatform(ctx: ActionContext, log: ActionLogRow, ptx: PlatformTx) {
    const before = log.before as { user_id: string; role: string };
    const after = log.after as { role: string };
    // TIP-042: vai trò cũ phải còn sống (tombstone không được hồi sinh qua hoàn tác) + người hoàn tác hiện tại không cấp vượt quyền mình.
    if (this.tenants) {
      const tenant = await this.tenants.get(TenantContexts.fromMembership(ctx.workspaceId, ctx.actor.id));
      await (ctx.authz.isOwner ? assignableRole(tenant, before.role) : assertAssignable(tenant, ctx.authz, before.role));
    }
    // Điều kiện trên role hiện tại = khoá lạc quan: người khác đổi tiếp / đã gỡ thành viên → không hoàn tác đè.
    const n = await ptx.membership.updateMany({
      where: { workspaceId: ctx.workspaceId, userId: before.user_id, status: 'active', roleKey: after.role },
      data: { roleKey: before.role },
    });
    if (n.count !== 1) throw new AppError('CONFLICT', 409, { role: 'changed' });
    await bumpAuthzEpoch(ptx, ctx.workspaceId);
    return { events: [{ topic: 'member.role_changed', payload: { user_id: before.user_id, role_key: before.role } }] };
  }

  async preview(ctx: ActionContext, input: Input, tx: TenantTx) {
    await assertAssignable(tx, ctx.authz, input.role);
    return setRolePreview(needPlatform(this.platform, 'member.set_role'), ctx.workspaceId, input);
  }
}
