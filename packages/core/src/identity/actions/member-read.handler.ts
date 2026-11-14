// member.search (TIP-023b R2 · DC-224, db platform, members.manage, read): Trợ lý tra thành viên đang hoạt động của workspace hiện tại theo
// tên / email / vai trò để có user_id. Không trả lời mời, số điện thoại, uỷ quyền; lọc không dấu như danh sách Cài đặt › Thành viên.
import { Injectable } from '@nestjs/common';
import { AppError, foldText } from '@appchat/shared';
import type { ActionInput, memberSearch } from '@appchat/actions';
import type { ActionContext, PlatformTx, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';

type Input = ActionInput<typeof memberSearch>;
type Out = { members: { user_id: string; name: string; email: string; role: string }[] };

@Injectable()
@ActionHandler('member.search')
export class MemberSearchHandler implements Handler<Input, Out> {
  async execute(ctx: ActionContext, i: Input, _tx: TenantTx, ptx?: PlatformTx): Promise<HandlerOutcome<Out>> {
    if (!ptx) throw new AppError('INTERNAL', 500, undefined, 'member.search cần PlatformTx');
    const ms = await ptx.membership.findMany({ where: { workspaceId: ctx.workspaceId, status: 'active', ...(i.role ? { roleKey: i.role } : {}) }, orderBy: { createdAt: 'asc' } });
    const users = ms.length ? await ptx.user.findMany({ where: { id: { in: ms.map((m) => m.userId) } }, select: { id: true, name: true, email: true } }) : [];
    const byId = new Map(users.map((u) => [u.id, u]));
    const f = foldText(i.q ?? '');
    const members = ms.flatMap((m) => {
      const u = byId.get(m.userId);
      return u && (!f || foldText(`${u.name} ${u.email}`).includes(f)) ? [{ user_id: u.id, name: u.name, email: u.email, role: m.roleKey }] : [];
    });
    return { result: { members: members.slice(0, i.limit ?? 10) } };
  }
}
