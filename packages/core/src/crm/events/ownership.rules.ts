// Thông báo chuyển phụ trách hai bên (TIP-015d §5, COMMERCE §8b): `contact.owner_changed` có biên nhận (`transfer_id`, không phải hoàn tác)
// → người mới (`to`) + người cũ (`from`, nếu có) mỗi chiều đúng một lần, kể cả khi người thực hiện chính là người nhận. Event chỉ mang
// id lần chuyển — tên khách / link chiếu lúc đọc theo quyền hiện tại (notify/services/ownership-notice). Hoàn tác / phân bổ tự động không thông báo ở đây.
import { contactOwnerChangedEvent } from '@appchat/shared';
import { registerNotificationRule, type NotifyIntent } from '../../notify/rules';

registerNotificationRule('crm.owner_transfer_notice', 'contact.owner_changed', (e) => {
  const p = contactOwnerChangedEvent.parse(e.payload);
  if (!p.transfer_id || p.undo || p.from === p.to) return [];
  const one = (userId: string, direction: 'from' | 'to'): NotifyIntent => ({ kind: 'crm_owner', to: { userIds: [userId] }, params: {}, ownershipNotice: { transferId: p.transfer_id!, direction } });
  return [one(p.to, 'to'), ...(p.from ? [one(p.from, 'from')] : [])];
});
