// Luật thông báo liệu trình (TIP-032b, COMMERCE §6): `package.reminder_due` (còn 1 buổi / còn 7 ngày tới hạn) → người phụ trách đơn sinh
// gói (không có → người có `package.manage`), mở Hồ sơ 360° của khách để gợi ý gia hạn / mua thêm. Chỉ phụ thuộc shared + notify.
import { packageReminderDueEvent } from '@appchat/shared';
import { registerNotificationRule } from '../../../notify/rules';

registerNotificationRule('sales.package_reminder', 'package.reminder_due', (e) => {
  const p = packageReminderDueEvent.parse(e.payload);
  const params: Record<string, string | number> = p.milestone === 'remaining_1' ? { variant: 'remaining', name: p.name, contact: p.contact } : { name: p.name, contact: p.contact, n: p.days ?? 0 };
  return [{ kind: 'package_reminder', to: p.owner_user_id ? { userIds: [p.owner_user_id] } : { permission: 'package.manage' }, params, link: `/customers?c=${p.contact_id}` }];
});
