// Đọc trạng thái yêu cầu tạo nhóm (TIP-023b SPEC D): đúng một id, kiểm scope TRƯỚC khi trả payload — người yêu cầu, Owner, hoặc người
// thấy được mọi hội thoại nguồn. Không có thì 404 (không lộ tồn tại). Chỉ đọc, không có GET thay đổi trạng thái.
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import { AppError, type AuthzContext } from '@appchat/shared';
import { canSeeConversation } from '../../inbox/services/access';
import { UUID } from './accounts.service';
import { requestDto, type Participant } from './group-requests';

type GroupRequestView = ReturnType<typeof requestDto>;

export class GroupRead {
  constructor(private readonly tenants: TenantDbResolver) {}

  async get(viewer: { workspaceId: string; userId: string; authz: AuthzContext }, id: string): Promise<GroupRequestView> {
    const db = await this.tenants.get(TenantContexts.fromRoute(viewer.workspaceId, 'groups'));
    const r = UUID.test(id) ? await db.conversationGroupRequest.findUnique({ where: { id } }) : null;
    if (!r) throw new AppError('NOT_FOUND', 404, { request_id: 'not_found' });
    if (!viewer.authz.isOwner && r.requesterId !== viewer.userId) {
      const ids = (r.participants as unknown as Participant[]).map((p) => p.conversation_id);
      const convs = await db.conversation.findMany({ where: { id: { in: ids } }, select: { id: true, contactId: true, assigneeUserId: true, teamId: true } });
      const all = convs.length === ids.length && (await Promise.all(convs.map((c) => canSeeConversation(db, viewer.authz, c)))).every(Boolean);
      if (!all) throw new AppError('NOT_FOUND', 404, { request_id: 'not_found' });
    }
    return requestDto(r);
  }
}
