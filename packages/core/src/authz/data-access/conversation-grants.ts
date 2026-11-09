// Đồng phụ trách hội thoại (`conversation_assignee` kind=user) — mirror contact-grants.ts nhưng không có vai trò watcher: có mặt
// trong bảng này = full phụ trách (đọc + ghi), vì chỉ thêm bằng tay qua menu ⋯, không có khái niệm "chỉ theo dõi" cho hội thoại.
// Index `conversation_assignee (kind, assignee_id, conversation_id)` → EXISTS là Index Only Scan cho kind='user'.
import { TenantSql as Prisma } from '@appchat/db';
import type { TenantTx } from '../../kernel/actions/action-context';

/** Người này có là đồng phụ trách (kind=user) của hội thoại này không. */
export async function isCoAssignee(tx: Pick<TenantTx, 'conversationAssignee'>, conversationId: string | null | undefined, userId: string): Promise<boolean> {
  if (!conversationId) return false;
  const row = await tx.conversationAssignee.findUnique({ where: { conversationId_kind_assigneeId: { conversationId, kind: 'user', assigneeId: userId } }, select: { conversationId: true } });
  return !!row;
}

/** Điều kiện SQL "người xem là đồng phụ trách (kind=user) của hội thoại ở cột `conversationCol`". */
export function coAssigneeSql(me: string, conversationCol: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`EXISTS (SELECT 1 FROM conversation_assignee ca WHERE ca.kind = 'user' AND ca.assignee_id = ${me}::uuid AND ca.conversation_id = ${conversationCol})`;
}
