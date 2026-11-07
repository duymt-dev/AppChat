// Luật của chính TIP-006: `notify.requested` (handler bất kỳ xin gửi thông báo), `member.role_changed` / `member.removed`
// (TIP-013 phát) → làm mới quyền / ngắt socket. Nạp khi import NotifyModule.
import { customFieldChangedEvent, memberRemovedEvent, memberRoleChangedEvent, notifyRequestedEvent } from '@appchat/shared';
import { FIELDS_CHANGED_EVENT } from '../../authz/fields/realtime';
import { registerNotificationRule, registerRealtimeRule } from '../rules';
import { rooms } from '../realtime/envelope';

registerNotificationRule('notify.requested', 'notify.requested', (e) => {
  const p = notifyRequestedEvent.parse(e.payload);
  return [{ kind: p.kind, to: { userIds: p.to.user_ids, permission: p.to.permission }, params: p.params, link: p.link, excludeUserId: p.exclude_user_id }];
});

registerRealtimeRule('member.role_changed', 'member.role_changed', (e) => {
  const p = memberRoleChangedEvent.parse(e.payload);
  return [{ ws: e.workspaceId, rooms: [rooms.user(p.user_id)], event: 'authz.changed', data: {}, control: { type: 'refresh_authz', userId: p.user_id } }];
});

registerRealtimeRule('member.removed', 'member.removed', (e) => {
  const p = memberRemovedEvent.parse(e.payload);
  return [{ ws: e.workspaceId, rooms: [], event: 'member.removed', data: {}, control: { type: 'disconnect', userId: p.user_id } }];
});

// Đổi định nghĩa / vai trò được thấy của trường (TIP-045b annex C): mọi socket của workspace làm mới danh sách + chi tiết (REST chiếu lại).
registerRealtimeRule('custom_field.changed', 'custom_field.changed', (e) => {
  const p = customFieldChangedEvent.parse(e.payload);
  return [{ ws: e.workspaceId, rooms: [rooms.ws(e.workspaceId)], event: FIELDS_CHANGED_EVENT, data: { entity: p.entity } }];
});
