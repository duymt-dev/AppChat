// Sự kiện bảo mật → thông báo Owner (TIP-045b annex A2, ops §4). Chi tiết an toàn: mã action (không input / mã / token); người làm tự
// không nhận. Dedupe = event_consumption của consumer notify (event ghi đúng một lần cùng action_log).
import { securityEventSchema } from '@appchat/shared';
import { registerNotificationRule } from '../rules';

registerNotificationRule('audit.security_event', 'audit.security_event', (e) => {
  const p = securityEventSchema.parse(e.payload);
  return [
    {
      kind: 'security_event',
      // Chỉ Owner (quyền OWNER_ONLY — không uỷ quyền) nhận.
      to: { permission: 'workspace.transfer_ownership' },
      params: { action: p.action_id, source: p.source },
      link: '/settings/audit',
      ...(p.actor_user_id ? { excludeUserId: p.actor_user_id } : {}),
    },
  ];
});
