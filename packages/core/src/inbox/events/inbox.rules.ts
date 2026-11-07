// Luật event Hộp thư (Blueprint §2.3, §4.6): tin vào / gửi / đổi → WS `message.new` / `message.updated` / `conversation.updated`
// tới phòng hội thoại + phòng workspace, lọc người nhận theo policy đọc inbox (assignee / phụ trách khách / nhóm / quan hệ khách — TIP-042c); thông báo
// `msg_assigned` (gán cho tôi), `msg_vip` (tin khách VIP). Nạp khi import InboxModule.
import { channelHistoryIngestedEvent, conversationAssignedEvent, conversationUpdatedEvent, messageFailedEvent, messageReceivedEvent, messageSentEvent, messageUpdatedEvent } from '@appchat/shared';
import type { DomainEvent } from '../../kernel/events/consumer';
import { registerNotificationRule, registerRealtimeRule } from '../../notify/rules';
import { rooms, type RealtimeEnvelope } from '../../notify/realtime/envelope';
import { convRecord } from '../../notify/realtime/records';

type ConvCols = { conversation_id: string; contact_id: string | null; assignee_user_id: string | null; contact_owner_user_id: string | null; team_id?: string | null | undefined };

function fanout(e: DomainEvent, p: ConvCols, event: string, data: Record<string, unknown>): RealtimeEnvelope[] {
  return [
    // Đang mở hội thoại: phòng `conv:{id}` (đã qua guard lúc vào phòng).
    { ws: e.workspaceId, rooms: [rooms.conv(p.conversation_id)], event, data, require: { permission: 'inbox.view' } },
    // Danh sách hội thoại của mọi người thấy được hội thoại này.
    { ws: e.workspaceId, rooms: [rooms.ws(e.workspaceId)], event: 'conversation.updated', data: { conversation_id: p.conversation_id }, require: { permission: 'inbox.view', record: convRecord(p) } },
  ];
}

registerRealtimeRule('inbox.message_new', 'message.received', (e) => {
  const p = messageReceivedEvent.parse(e.payload);
  return fanout(e, p, 'message.new', { conversation_id: p.conversation_id, message_id: p.message_id });
});

registerRealtimeRule('inbox.message_sent', 'message.sent', (e) => {
  const p = messageSentEvent.parse(e.payload);
  return fanout(e, p, 'message.updated', { conversation_id: p.conversation_id, message_id: p.message_id, status: 'sent' });
});

registerRealtimeRule('inbox.message_failed', 'message.failed', (e) => {
  const p = messageFailedEvent.parse(e.payload);
  return fanout(e, p, 'message.updated', { conversation_id: p.conversation_id, message_id: p.message_id, status: 'failed' });
});

registerRealtimeRule('inbox.message_updated', 'message.updated', (e) => {
  const p = messageUpdatedEvent.parse(e.payload);
  return fanout(e, p, 'message.updated', { conversation_id: p.conversation_id, message_id: p.message_id, change: p.change });
});

registerRealtimeRule('inbox.conversation_updated', 'conversation.updated', (e) => {
  const p = conversationUpdatedEvent.parse(e.payload);
  return fanout(e, p, 'conversation.updated', { conversation_id: p.conversation_id, change: p.change });
});

registerRealtimeRule('inbox.conversation_assigned', 'conversation.assigned', (e) => {
  const p = conversationAssignedEvent.parse(e.payload);
  return fanout(e, p, 'conversation.updated', { conversation_id: p.conversation_id, change: 'assign' });
});

// Lịch sử kênh đã lưu (TIP-014b C): chỉ làm mới danh sách hộp thư của người có quyền xem — không `message.new` (không âm báo), không
// thông báo VIP / phân công, không agent. Lọc scope theo hội thoại cụ thể không có trong payload → client tự lọc khi tải lại (REST theo scope).
registerRealtimeRule('inbox.history_ingested', 'channel.history_ingested', (e) => {
  const p = channelHistoryIngestedEvent.parse(e.payload);
  return [{ ws: e.workspaceId, rooms: [rooms.ws(e.workspaceId)], event: 'conversation.updated', data: { change: 'history', count: p.conversation_ids.length }, require: { permission: 'inbox.view' } }];
});

/** FE mở hội thoại theo `?c=` (route `/inbox` một trang). */
const link = (id: string) => `/inbox?c=${id}`;

registerNotificationRule('inbox.assigned', 'conversation.assigned', (e) => {
  const p = conversationAssignedEvent.parse(e.payload);
  if (!p.assignee_user_id || p.assignee_user_id === p.by_user_id) return [];
  return [{ kind: 'msg_assigned', to: { userIds: [p.assignee_user_id] }, params: { contact: p.title }, link: link(p.conversation_id) }];
});

registerNotificationRule('inbox.vip', 'message.received', (e) => {
  const p = messageReceivedEvent.parse(e.payload);
  if (!p.vip) return [];
  // Người phụ trách hội thoại (hoặc khách); chưa ai → người quản lý hộp thư.
  const to = p.assignee_user_id ?? p.contact_owner_user_id;
  return [{ kind: 'msg_vip', to: to ? { userIds: [to] } : { permission: 'inbox.assign' }, params: { contact: p.title }, link: link(p.conversation_id) }];
});
