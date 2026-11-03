// Preview đánh dấu đã đọc (TIP-023b R2.8): số thông báo CHƯA đọc của chính người gọi sẽ đổi (tất cả hoặc theo id). Chỉ đọc.
import type { ActionInput, ActionPreview, notificationMarkRead } from '@appchat/actions';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { preview } from '../../../kernel/actions/preview-kit';

export async function markReadPreview(tx: TenantTx, userId: string, i: ActionInput<typeof notificationMarkRead>): Promise<ActionPreview> {
  const n = await tx.notification.count({ where: { userId, readAt: null, ...(i.ids === 'all' ? {} : { id: { in: i.ids } }) } });
  return preview('write', `${n}`, { count: n, changes: [{ entity: 'notification', after: { read: true, scope: i.ids === 'all' ? 'all' : 'selected' } }] });
}
