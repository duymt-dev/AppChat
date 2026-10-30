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
} as const;
export type EventTopic = keyof typeof EVENT_SCHEMAS;
