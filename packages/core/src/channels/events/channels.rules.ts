// Luật event kênh (Blueprint §2.3, §4.6): `channel.status_changed` → WS `channel.status` cho người quản lý kênh; hết phiên / lỗi
// gửi bất thường → thông báo `channel_down` (REQ-B02 "báo trạng thái", B04 "tự ngắt khi bị chặn" → báo Owner). Nạp khi import ChannelsModule.
import { channelConnectedEvent, channelStatusChangedEvent } from '@appchat/shared';
import { registerNotificationRule, registerRealtimeRule } from '../../notify/rules';
import { rooms } from '../../notify/realtime/envelope';

/** Lý do đáng báo người dùng (tự ngắt / hết phiên) — tạm dừng / ngắt do chính người dùng bấm thì không. */
const DOWN = new Set(['expired', 'send_errors', 'login_failed']);

registerNotificationRule('channels.down', 'channel.status_changed', (e) => {
  const p = channelStatusChangedEvent.parse(e.payload);
  if (!p.reason || !DOWN.has(p.reason)) return [];
  return [{ kind: 'channel_down', to: { permission: 'channels.manage' }, params: { channel: p.name }, link: '/settings/channels' }];
});

registerRealtimeRule('channels.status', 'channel.status_changed', (e) => {
  const p = channelStatusChangedEvent.parse(e.payload);
  const data = { account_id: p.channel_account_id, type: p.type, status: p.status, paused: p.paused };
  return [{ ws: e.workspaceId, rooms: [rooms.ws(e.workspaceId)], event: 'channel.status', data, require: { permission: 'channels.manage' } }];
});

registerRealtimeRule('channels.connected', 'channel.connected', (e) => {
  const p = channelConnectedEvent.parse(e.payload);
  const data = { account_id: p.channel_account_id, type: p.type, status: 'connected', paused: false };
  return [{ ws: e.workspaceId, rooms: [rooms.ws(e.workspaceId)], event: 'channel.status', data, require: { permission: 'channels.manage' } }];
});
