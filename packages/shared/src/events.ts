// Domain event dùng chung (standards/events/outbox.md §3): tên `<entity>.<past_tense>` + zod payload. Payload luôn có `ws`
// + `occurred_at` (writeOutbox thêm). TIP domain thêm event của mình vào đây khi phát (và bảng Blueprint §2.3).
import { z } from 'zod';
import { PERMISSIONS } from './authz/permissions';
import { NOTIFY_KIND_KEYS, type NotifyKind } from './notify/catalog';

const base = { ws: z.string().uuid(), occurred_at: z.string() };

/** Xin gửi thông báo (TIP-006): handler bất kỳ phát event này thay vì tự ghi `notification` / gửi email. */
export const notifyRequestedEvent = z.object({
  ...base,
  kind: z.enum(NOTIFY_KIND_KEYS as [NotifyKind, ...NotifyKind[]]),
  /** Người nhận: danh sách user và / hoặc mọi thành viên có permission (Owner luôn có). Ít nhất một. */
  to: z.object({ user_ids: z.array(z.string().uuid()).max(500).optional(), permission: z.enum(PERMISSIONS).optional() }).refine((t) => t.user_ids?.length || t.permission, 'to rỗng'),
  /** Tham số chữ `{x}` của mẫu i18n/server. */
  params: z.record(z.string(), z.union([z.string().max(200), z.number()])).default({}),
  /** Đường dẫn trong app, vd. `/inbox?c=…` (email ghép APP_PUBLIC_URL). */
  link: z.string().startsWith('/').max(500).optional(),
  /** Không gửi người gây ra sự kiện. */
  exclude_user_id: z.string().uuid().optional(),
});
export type NotifyRequestedEvent = z.infer<typeof notifyRequestedEvent>;

/** Đổi vai trò / uỷ quyền (TIP-013 phát) — xoá cache AuthzContext, WS `authz.changed`. */
export const memberRoleChangedEvent = z.object({ ...base, user_id: z.string().uuid(), role_key: z.string().optional() });
/** Gỡ thành viên (TIP-013 phát) — ngắt socket của người đó. */
export const memberRemovedEvent = z.object({ ...base, user_id: z.string().uuid() });

/** Khai báo DN lần đầu (TIP-004 phát) — billing bắt đầu trial (TIP-009). */
export const workspaceDeclaredEvent = z.object({ ...base, workspace_id: z.string().uuid(), kind: z.string().optional() });

/** Ví credit (TIP-009): chạm ngưỡng 80 / 95% hạn mức tháng, hết, có lại. */
export const creditsLowEvent = z.object({ ...base, level: z.union([z.literal(80), z.literal(95)]), balance: z.number() });
export const creditsExhaustedEvent = z.object({ ...base, balance: z.number() });
export const creditsRestoredEvent = z.object({ ...base, balance: z.number() });
/** Đổi gói / trạng thái subscription (TIP-009 / 010). */
export const subscriptionChangedEvent = z.object({ ...base, plan_key: z.string(), status: z.enum(['trialing', 'active', 'expired', 'cancelled']), from_plan_key: z.string().nullable() });
/** Hoá đơn gói AppChat đã thanh toán + ghi nhận (TIP-010) — notify Owner, làm mới màn Gói & ví. */
export const billingInvoicePaidEvent = z.object({ ...base, invoice_id: z.string().uuid(), code: z.string(), kind: z.enum(['plan', 'credits', 'addon', 'upgrade_proration']), amount: z.string() });
export const trialExpiredEvent = z.object({ ...base, plan_key: z.string() });

/** Kết nối connector của workspace (TIP-012, Blueprint §2.3): kết nối / ngắt / lỗi gọi ra ngoài (hết lượt thử). */
const integrationBase = { ...base, connection_id: z.string().uuid(), connector_key: z.string() };
export const integrationConnectedEvent = z.object(integrationBase);
export const integrationDisconnectedEvent = z.object(integrationBase);
export const integrationErrorEvent = z.object({ ...integrationBase, op: z.string(), error: z.string().max(500) });
/** Webhook đã xác thực + lưu `integration_event` — consumer domain theo port xử lý (TIP-010 / 031 / 032). */
export const integrationEventReceivedEvent = z.object({ ...integrationBase, port: z.string(), event_id: z.string().uuid(), kind: z.string() });

/** Tài khoản kênh (TIP-014, Blueprint §2.3 / §4.6 `channel.status`): kết nối xong (QR quét / kết nối lại), đổi trạng thái
 * (tạm dừng / tiếp tục / hết phiên / lỗi / ngắt) — realtime trang Kênh, thông báo `channel_down`, Inbox (TIP-016). */
const channelBase = { ...base, channel_account_id: z.string().uuid(), type: z.string() };
export const channelConnectedEvent = z.object({ ...channelBase, name: z.string() });
export const channelStatusChangedEvent = z.object({
  ...channelBase,
  name: z.string(),
  status: z.enum(['pending', 'connecting', 'connected', 'error', 'disconnected', 'expired']),
  paused: z.boolean(),
  /** Lý do khi xấu đi: `expired` (hết phiên) · `send_errors` (lỗi gửi bất thường → tự tạm dừng) · `login_failed`. */
  reason: z.string().max(60).optional(),
});

/** Khách hàng (TIP-015, Blueprint §2.3): timeline, phân khúc marketing, AI task, notify. */
const contactBase = { ...base, contact_id: z.string().uuid() };
export const contactCreatedEvent = z.object({ ...contactBase, owner_user_id: z.string().uuid().nullable(), source: z.string() });
export const contactStageChangedEvent = z.object({ ...contactBase, from: z.string(), to: z.string(), manual: z.boolean() });
export const contactMergedEvent = z.object({ ...contactBase, merged_ids: z.array(z.string().uuid()) });
/** Chuyển phụ trách — `move` báo domain hội thoại / báo giá / lịch hẹn chuyển bản ghi đang mở (TIP-016 / 028 / 033). */
export const contactOwnerChangedEvent = z.object({
  ...contactBase,
  from: z.string().uuid().nullable(),
  to: z.string().uuid(),
  move: z.object({ conversations: z.boolean(), quotes: z.boolean(), appointments: z.boolean() }),
});
export const contactCollaboratorChangedEvent = z.object({ ...contactBase, user_id: z.string().uuid(), role: z.enum(['collaborator', 'watcher']).nullable() });
export const contactAccessRequestedEvent = z.object({ ...contactBase, request_id: z.string().uuid(), requester_user_id: z.string().uuid() });
export const contactAccessDecidedEvent = z.object({ ...contactBase, request_id: z.string().uuid(), requester_user_id: z.string().uuid(), status: z.enum(['approved', 'rejected']) });

/** Hộp thư (TIP-016, Blueprint §2.3): tin vào / gửi xong / gửi lỗi, gán hội thoại, cập nhật hội thoại (realtime). Mang các cột
 * scope (`assignee_user_id`, `contact_id`) để lọc người nhận realtime theo data scope inbox. */
const convBase = {
  ...base,
  conversation_id: z.string().uuid(),
  channel_account_id: z.string().uuid(),
  contact_id: z.string().uuid().nullable(),
  assignee_user_id: z.string().uuid().nullable(),
  /** Người phụ trách khách lúc phát — scope own của người nhận realtime. */
  contact_owner_user_id: z.string().uuid().nullable(),
};
export const messageReceivedEvent = z.object({ ...convBase, message_id: z.string().uuid(), new_conversation: z.boolean(), is_group: z.boolean(), mentions_me: z.boolean(), vip: z.boolean(), title: z.string() });
export const messageSentEvent = z.object({ ...convBase, message_id: z.string().uuid(), sender_type: z.enum(['user', 'agent', 'system']), sender_id: z.string().nullable() });
export const messageFailedEvent = z.object({ ...convBase, message_id: z.string().uuid(), error: z.string().max(200) });
export const messageUpdatedEvent = z.object({ ...convBase, message_id: z.string().uuid(), change: z.enum(['recalled', 'deleted', 'restored', 'reaction', 'status']) });
export const conversationAssignedEvent = z.object({ ...convBase, assignee_agent_id: z.string().nullable(), by_user_id: z.string().uuid().nullable(), auto: z.boolean(), title: z.string() });
export const conversationUpdatedEvent = z.object({ ...convBase, change: z.string().max(40) });

/** Huỷ run AI (TIP-019 `run.cancel`) — run gốc được bấm dừng + mọi run trong cây đã huỷ (realtime `run.done` ở TIP-023). */
/** Nguồn tri thức nạp xong / lỗi (TIP-020) — WS cập nhật trang Dữ liệu RAG; lỗi thì báo người tải lên. */
export const kbSourceReadyEvent = z.object({ ...base, source_id: z.string().uuid(), chunk_count: z.number().int() });
export const kbSourceFailedEvent = z.object({ ...base, source_id: z.string().uuid(), error: z.string().max(300), created_by: z.string().uuid().nullable() });
export const runCancelledEvent = z.object({ ...base, run_id: z.string().uuid(), run_ids: z.array(z.string().uuid()) });

export const EVENT_SCHEMAS = {
  'workspace.declared': workspaceDeclaredEvent,
  'credits.low': creditsLowEvent,
  'credits.exhausted': creditsExhaustedEvent,
  'credits.restored': creditsRestoredEvent,
  'subscription.changed': subscriptionChangedEvent,
  'billing.invoice_paid': billingInvoicePaidEvent,
  'trial.expired': trialExpiredEvent,
  'notify.requested': notifyRequestedEvent,
  'member.role_changed': memberRoleChangedEvent,
  'member.removed': memberRemovedEvent,
  'integration.connected': integrationConnectedEvent,
  'integration.disconnected': integrationDisconnectedEvent,
  'integration.error': integrationErrorEvent,
  'integration.event_received': integrationEventReceivedEvent,
  'channel.connected': channelConnectedEvent,
  'channel.status_changed': channelStatusChangedEvent,
  'contact.created': contactCreatedEvent,
  'contact.stage_changed': contactStageChangedEvent,
  'contact.merged': contactMergedEvent,
  'contact.owner_changed': contactOwnerChangedEvent,
  'contact.collaborator_changed': contactCollaboratorChangedEvent,
  'contact.access_requested': contactAccessRequestedEvent,
  'contact.access_decided': contactAccessDecidedEvent,
  'message.received': messageReceivedEvent,
  'message.sent': messageSentEvent,
  'message.failed': messageFailedEvent,
  'message.updated': messageUpdatedEvent,
  'conversation.assigned': conversationAssignedEvent,
  'conversation.updated': conversationUpdatedEvent,
  'run.cancelled': runCancelledEvent,
  'kb.source_ready': kbSourceReadyEvent,
  'kb.source_failed': kbSourceFailedEvent,
} as const;
export type EventTopic = keyof typeof EVENT_SCHEMAS;
