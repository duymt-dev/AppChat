// member.remove (db platform, members.manage, delete) — Cài đặt › Thành viên › Xoá. Owner / tự gỡ mình → 422; membership `removed`
// (giữ dòng để lịch sử / chuyển phụ trách — TIP-015); event `member.removed` (TIP-006: ngắt socket người đó). Dữ liệu tenant giữ nguyên.
import { Inject, Injectable, Optional } from '@nestjs/common';
import type { PlatformDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { ActionInput, memberRemove } from '@appchat/actions';
import type { ActionContext, PlatformTx, TenantTx } from '../../kernel/actions/action-context';
import { bumpAuthzEpoch } from '../../kernel/consistency/handler-adapter';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { needPlatform } from './previews/platform-read';
import { removePreview } from './previews/member-remove.handler.preview';
import { PLATFORM_DB } from '../../kernel/tenant/tenant.providers';
import { activeMember } from './member-guard';

type Input = ActionInput<typeof memberRemove>;

@Injectable()
@ActionHandler('member.remove')
export class MemberRemoveHandler implements Handler<Input, { ok: boolean }> {
  constructor(@Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | undefined) {}

  async execute(ctx: ActionContext, input: Input, _tx: TenantTx, ptx?: PlatformTx): Promise<HandlerOutcome<{ ok: boolean }>> {
    if (!ptx) throw new AppError('INTERNAL', 500, undefined, 'member.remove cần PlatformTx');
    if (ctx.actor.type === 'user' && input.user_id === ctx.actor.id) throw new AppError('VALIDATION_FAILED', 422, { user_id: 'self' });
    const m = await activeMember(ptx, ctx.workspaceId, input.user_id);
    await ptx.membership.update({ where: { workspaceId_userId: { workspaceId: ctx.workspaceId, userId: m.userId } }, data: { status: 'removed' } });
    // Quyền của người bị gỡ hết ngay (TIP-045b): phiên bản quyền tăng cùng transaction — socket / AI / tệp kiểm membership + epoch hiện tại.
    await bumpAuthzEpoch(ptx, ctx.workspaceId);
    return {
      result: { ok: true },
      before: { user_id: m.userId, role: m.roleKey, status: 'active' },
      after: { user_id: m.userId, status: 'removed' },
      events: [{ topic: 'member.removed', payload: { user_id: m.userId } }],
    };
  }

  async preview(ctx: ActionContext, input: Input) {
    return removePreview(ctx, needPlatform(this.platform, 'member.remove'), input);
  }
}
