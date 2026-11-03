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
/** Tạo nhóm kênh (TIP-023b SPEC D): yêu cầu đã lưu → consumer đẩy tới worker giữ phiên; kết quả (succeeded / failed / unknown) → realtime người yêu cầu. */
export const groupRequestedEvent = z.object({ ...base, request_id: z.string().uuid(), channel_account_id: z.string().uuid() });
export const groupResultEvent = z.object({ ...base, request_id: z.string().uuid(), channel_account_id: z.string().uuid(), requester_id: z.string().uuid().nullable(), status: z.string(), conversation_id: z.string().uuid().nullable() });

/** Huỷ run AI (TIP-019 `run.cancel`) — run gốc được bấm dừng + mọi run trong cây đã huỷ (realtime `run.done` ở TIP-023). */
/** Nguồn tri thức nạp xong / lỗi (TIP-020) — WS cập nhật trang Dữ liệu RAG; lỗi thì báo người tải lên. */
export const kbSourceReadyEvent = z.object({ ...base, source_id: z.string().uuid(), chunk_count: z.number().int() });
export const kbSourceFailedEvent = z.object({ ...base, source_id: z.string().uuid(), error: z.string().max(300), created_by: z.string().uuid().nullable() });
export const runCancelledEvent = z.object({ ...base, run_id: z.string().uuid(), run_ids: z.array(z.string().uuid()) });
/** Vòng đời AI Agent (TIP-021): xuất bản / tạm dừng / xoá — làm mới routing agent theo kênh (TIP-022), WS danh sách agent. */
export const agentChangedEvent = z.object({ ...base, agent_id: z.string().uuid(), version: z.number().int(), status: z.enum(['draft', 'active', 'paused', 'deleted']) });
/** Hàng chờ duyệt (TIP-021): tạo → thông báo người duyệt (`ai_review`); quyết / hết hạn → job `ai-resume` chạy tiếp run. */
export const approvalRequestedEvent = z.object({ ...base, approval_id: z.string().uuid(), action_id: z.string(), permission: z.string(), agent: z.string(), title: z.string() });
/** `edited` = duyệt kèm sửa input (approval.edit_and_approve — TIP-024). */
export const approvalDecidedEvent = z.object({ ...base, approval_id: z.string().uuid(), run_id: z.string().uuid().nullable(), status: z.enum(['approved', 'edited', 'rejected', 'expired']) });

/** Sản phẩm đổi (TIP-027): tạo / sửa / lưu trữ / khôi phục → consumer `catalog-sync` nạp lại nguồn RAG (không giá / tồn — rag §2). */
export const productChangedEvent = z.object({ ...base, product_id: z.string().uuid(), change: z.enum(['created', 'updated', 'archived', 'restored', 'deleted']) });

/** Agent trực kênh chuyển hội thoại sang người (TIP-022) — thông báo `ai_escalate`, WS cập nhật hội thoại. */
export const aiHandoffEvent = z.object({ ...convBase, run_id: z.string().uuid().nullable(), agent_id: z.string().nullable(), agent: z.string(), reason: z.string().max(40), title: z.string() });

/** Báo giá đổi trạng thái (TIP-029 — Blueprint §2.3): giai đoạn CRM theo COMMERCE §8, dòng thời gian khách, nhắc hết hạn. */
const quoteBase = { ...base, quote_id: z.string().uuid(), contact_id: z.string().uuid(), code: z.string(), version: z.number().int() };
export const quoteSentEvent = z.object({ ...quoteBase, channel: z.string(), valid_until: z.string() });
export const quoteViewedEvent = z.object(quoteBase);
export const quoteDecidedEvent = z.object({ ...quoteBase, reason: z.string().max(500).optional() });

/** Hợp đồng đổi trạng thái (TIP-030 — Blueprint §2.3): giai đoạn CRM "Hợp đồng", dòng thời gian, thông báo Owner, nhắc gia hạn. */
const contractBase = { ...base, contract_id: z.string().uuid(), contact_id: z.string().uuid(), code: z.string() };
export const contractEvent = z.object(contractBase);
export const contractReasonEvent = z.object({ ...contractBase, reason: z.string().max(500).optional() });
export const contractSignedEvent = z.object({ ...contractBase, signed_sha256: z.string() });

/** Đơn hàng (TIP-031 — Blueprint §2.3): xác nhận (trừ kho), hoàn tất (giai đoạn Đã mua, điểm — TIP-036 cộng), huỷ (hoàn kho, yêu cầu
 *  hoàn tiền — TIP-032), đơn sàn nhập / cập nhật (D31). `total` là string VND. */
const orderBase = { ...base, order_id: z.string().uuid(), contact_id: z.string().uuid(), code: z.string(), source: z.string(), total: z.string() };
export const orderEvent = z.object(orderBase);
export const orderCompletedEvent = z.object({ ...orderBase, points: z.number().int(), net_before_vat: z.string() });
export const orderCancelledEvent = z.object({ ...orderBase, reason: z.string().max(500), paid_total: z.string(), refund_requested: z.boolean() });

/** Đề nghị thanh toán / khoản thu / liệu trình (TIP-032 — Blueprint §2.3). Tiền là string VND; hoàn tiền `amount` dương = số hoàn. */
const uuidOrNull = z.string().uuid().nullable();
export const invoiceEvent = z.object({ ...base, invoice_id: z.string().uuid(), contact_id: z.string().uuid(), order_id: uuidOrNull, code: z.string(), amount: z.string(), status: z.string() });
export const paymentConfirmedEvent = z.object({ ...base, payment_id: z.string().uuid(), invoice_id: uuidOrNull, order_id: uuidOrNull, contact_id: z.string().uuid(), amount: z.string(), method: z.string(), receipt_code: z.string().nullable(), status: z.string() });
export const paymentRefundEvent = z.object({ ...base, payment_id: z.string().uuid(), invoice_id: uuidOrNull, order_id: uuidOrNull, package_id: uuidOrNull, contact_id: z.string().uuid(), amount: z.string() });
export const bankTxEvent = z.object({ ...base, bank_tx_id: z.string().uuid(), amount: z.string(), status: z.string(), reason: z.string().nullable() });
export const packageEvent = z.object({ ...base, package_id: z.string().uuid(), contact_id: z.string().uuid(), order_id: uuidOrNull.optional(), total_sessions: z.number().int().optional() });
export const appointmentEvent = z.object({ ...base, appointment_id: z.string().uuid(), contact_id: z.string().uuid(), service_id: z.string().uuid(), staff_id: z.string().uuid(), code: z.string(), start_at: z.string(), status: z.string(), package_id: uuidOrNull.optional() });
/** Ticket (TIP-034): tạo / đóng / mở lại / SLA sắp đến hạn / quá hạn — consumer notify (leo thang), timeline, CSAT. */
export const ticketEvent = z.object({ ...base, ticket_id: z.string().uuid(), code: z.string(), title: z.string(), contact_id: uuidOrNull, conversation_id: uuidOrNull, assignee_user_id: uuidOrNull, assignee_agent_id: uuidOrNull, status: z.string(), priority: z.string(), sla: z.enum(['frt', 'ttr']).optional(), sla_result: z.string().nullable().optional(), by_user_id: uuidOrNull.optional() });

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
  'channel.group_requested': groupRequestedEvent,
  'channel.group_result': groupResultEvent,
  'run.cancelled': runCancelledEvent,
  'kb.source_ready': kbSourceReadyEvent,
  'kb.source_failed': kbSourceFailedEvent,
  'agent.published': agentChangedEvent,
  'agent.paused': agentChangedEvent,
  'agent.deleted': agentChangedEvent,
  'approval.requested': approvalRequestedEvent,
  'approval.decided': approvalDecidedEvent,
  'ai.handoff': aiHandoffEvent,
  'product.changed': productChangedEvent,
  'quote.sent': quoteSentEvent,
  'quote.viewed': quoteViewedEvent,
  'quote.accepted': quoteDecidedEvent,
  'quote.rejected': quoteDecidedEvent,
  'quote.expired': quoteDecidedEvent,
  'contract.approved': contractEvent,
  'contract.sent_for_signature': contractEvent,
  'contract.signed': contractSignedEvent,
  'contract.declined': contractReasonEvent,
  'contract.expiring': contractEvent,
  'contract.expired': contractEvent,
  'contract.terminated': contractReasonEvent,
  'order.created': orderEvent,
  'order.confirmed': orderEvent,
  'order.completed': orderCompletedEvent,
  'order.cancelled': orderCancelledEvent,
  'order.imported': orderEvent,
  'order.external_updated': orderEvent,
  'invoice.created': invoiceEvent,
  'invoice.sent': invoiceEvent,
  'invoice.overdue': invoiceEvent,
  'invoice.voided': invoiceEvent,
  'payment.confirmed': paymentConfirmedEvent,
  'payment.refund_requested': paymentRefundEvent,
  'payment.refunded': paymentRefundEvent,
  'payment.refund_rejected': paymentRefundEvent,
  'bank_tx.received': bankTxEvent,
  'package.granted': packageEvent,
  'package.expired': packageEvent,
  'package.changed': packageEvent,
  'appointment.created': appointmentEvent,
  'appointment.confirmed': appointmentEvent,
  'appointment.rescheduled': appointmentEvent,
  'appointment.checked_in': appointmentEvent,
  'appointment.completed': appointmentEvent,
  'appointment.no_show': appointmentEvent,
  'appointment.cancelled': appointmentEvent,
  'appointment.expired': appointmentEvent,
  'ticket.created': ticketEvent,
  'ticket.assigned': ticketEvent,
  'ticket.updated': ticketEvent,
  'ticket.closed': ticketEvent,
  'ticket.reopened': ticketEvent,
  'ticket.sla_warning': ticketEvent,
  'ticket.sla_breached': ticketEvent,
} as const;
export type EventTopic = keyof typeof EVENT_SCHEMAS;
