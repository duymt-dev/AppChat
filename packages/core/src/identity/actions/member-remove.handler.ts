// member.remove (db platform, members.manage, delete) — Cài đặt › Thành viên › Xoá. Owner / tự gỡ mình → 422; membership `removed`
// (giữ dòng để lịch sử / chuyển phụ trách — TIP-015); event `member.removed` (TIP-006: ngắt socket người đó). Dữ liệu tenant giữ nguyên.
import { Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, memberRemove } from '@appchat/actions';
import type { ActionContext, PlatformTx, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { activeMember } from './member-guard';

type Input = ActionInput<typeof memberRemove>;

@Injectable()
@ActionHandler('member.remove')
export class MemberRemoveHandler implements Handler<Input, { ok: boolean }> {
  async execute(ctx: ActionContext, input: Input, _tx: TenantTx, ptx?: PlatformTx): Promise<HandlerOutcome<{ ok: boolean }>> {
    if (!ptx) throw new AppError('INTERNAL', 500, undefined, 'member.remove cần PlatformTx');
    if (ctx.actor.type === 'user' && input.user_id === ctx.actor.id) throw new AppError('VALIDATION_FAILED', 422, { user_id: 'self' });
    const m = await activeMember(ptx, ctx.workspaceId, input.user_id);
    await ptx.membership.update({ where: { workspaceId_userId: { workspaceId: ctx.workspaceId, userId: m.userId } }, data: { status: 'removed' } });
    return {
      result: { ok: true },
      before: { user_id: m.userId, role: m.roleKey, status: 'active' },
      after: { user_id: m.userId, status: 'removed' },
      events: [{ topic: 'member.removed', payload: { user_id: m.userId } }],
    };
  }
}
