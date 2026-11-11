// Manifest consumer kỳ vọng của worker (TIP-003b §5.2–5.3) — liệt kê ĐỘC LẬP với thứ đã đăng ký lúc chạy (readiness so hai bên).
// Hiện mọi consumer queue `events` còn là handler v1 → `requires_adapter` (chủ adapter ghi rõ): v2 KHÔNG bật được cho tới khi adapter
// thật đăng ký hợp đồng projection / action / handoff đúng version (003c hành vi nghiệp vụ hệ thống, 006b projection / giao / fanout,
// TIP chủ module cho phần còn lại). `sales.quote-owner`: 015d đã bỏ mọi ghi — chỉ còn nhận + log event cũ (không đổi chủ); v2 sẽ là
// projection `no_effect`, không bao giờ khôi phục hành vi ghi.
import type { EventProtocolManifest, ManifestConsumer } from '@appchat/core';

const jobs = ['jobs', 'all'] as const;
const pending = (name: string, owner: string): ManifestConsumer => ({ name, status: 'requires_adapter', owner, roles: jobs });
/** TIP-003c: adapter action-mode v2 đã đăng ký (kernel/actions/system/event-adapter) — v1 giữ tới cutover. */
const action = (name: string, topics: readonly string[]): ManifestConsumer => ({ name, status: 'active', mode: 'action', contractVersion: 1, topics, owner: '003c', roles: jobs });

export const EVENT_PROTOCOL_MANIFEST: EventProtocolManifest = {
  version: 1,
  consumers: [
    // 015d: không còn ghi — v2 không đăng ký hợp đồng (chỉ v1 drain log event cũ tới cutover).
    { name: 'sales.quote-owner', status: 'retired', owner: '015d', roles: jobs },
    action('sales.payment-packages', ['order.confirmed', 'appointment.completed']),
    pending('sales.order-sync', '003c'),
    action('sales.bank-ingest', ['bank_receipt.accepted']),
    pending('billing.trial', '003c'),
    action('support', ['message.received', 'message.sent']),
    pending('support.ai-complaint', '003c'),
    action('crm.lead-routing', ['lead.routing_requested']),
    action('loyalty.orders', ['order.completed', 'order.cancelled']),
    action('loyalty.payments', ['payment.refunded']),
    pending('notify', '006b'),
    pending('realtime', '006b'),
    pending('catalog-sync', '006b'),
    pending('catalog.product-import', '006b'),
    pending('ai-tasks', '006b'),
    pending('kernel.data-jobs', '006b'),
    pending('lifecycle.activity', '006b'),
    pending('ai.credit-handoff', '006b'),
    pending('ai.operation-continuation', '006b'),
    pending('assistant-turn', '006b'),
    pending('assistant-input', '006b'),
    pending('discovery-build', '006b'),
    pending('kb-suggest', '006b'),
    pending('marketing.analyze', '006b'),
    pending('marketing.attribution', '006b'),
    pending('channels.contacts_request', '006b'),
    pending('channels.friend_request', '006b'),
    pending('channels.group_command', '006b'),
    pending('channels.group_request', '006b'),
    pending('channels.history_request', '006b'),
    pending('channels.operation_request', '006b'),
  ],
  // Topic đang phát không có consumer domain nào (rà nguồn 2026-11-11) — khai tường minh, không bịa giao realtime.
  noSubscriber: ['workspace.ready', 'tag.created'],
};
