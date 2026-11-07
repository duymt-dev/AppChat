// Hoàn tác conversation.bulk_update chạy ngay (TIP-025b §C.3): mỗi hội thoại kiểm lại quyền ghi HIỆN TẠI của người hoàn tác; mỗi trường
// chỉ khôi phục khi giá trị hiện tại vẫn đúng là giá trị lô đã đặt (so sánh sau-ghi) — người khác đã đổi sau đó thì giữ thay đổi mới. Thẻ
// chỉ gỡ đúng những thẻ lô đã thêm. Hội thoại không còn quyền / đã xoá → bỏ qua (không lộ, không ghi đè).
import type { AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { writableConversation } from '../services/access';
import type { BulkChange, BulkItemBefore } from '../services/conversation-mutations';

export async function bulkUndo(tx: TenantTx, authz: AuthzContext, items: BulkItemBefore[], ch: BulkChange): Promise<{ restored: number; conflicts: number }> {
  let restored = 0;
  let conflicts = 0;
  for (const it of items) {
    let c;
    try {
      c = await writableConversation(tx, authz, it.conv.id);
    } catch {
      conflicts++;
      continue;
    }
    const b = it.conv;
    const data: Record<string, unknown> = {};
    let clash = false;
    if (ch.assignee_user_id && b.assigneeUserId !== ch.assignee_user_id) {
      if (c.assigneeUserId === ch.assignee_user_id) data.assigneeUserId = b.assigneeUserId ?? null;
      else clash = true;
    }
    if (ch.status && b.status !== ch.status) {
      if (c.status === ch.status && !c.snoozedUntil) Object.assign(data, { status: b.status, snoozedUntil: typeof b.snoozedUntil === 'string' ? new Date(b.snoozedUntil) : null });
      else clash = true;
    }
    if (ch.archive !== undefined && !!b.archivedAt !== ch.archive) {
      if (!!c.archivedAt === ch.archive) data.archivedAt = typeof b.archivedAt === 'string' ? new Date(b.archivedAt) : null;
      else clash = true;
    }
    if (Object.keys(data).length) await tx.conversation.update({ where: { id: c.id }, data });
    if (it.added.length) await tx.conversationTag.deleteMany({ where: { conversationId: c.id, tagId: { in: it.added } } });
    if (clash) conflicts++;
    else if (Object.keys(data).length || it.added.length) restored++;
  }
  return { restored, conflicts };
}
