// Danh mục loại thông báo (Blueprint §2.2 `notification`, REQ-M02) — dùng chung FE (Cài đặt › Thông báo: nhóm + kênh mặc định)
// và BE (icon / tone trong popover chuông, kênh mặc định khi user chưa lưu tuỳ chọn). Thêm loại = thêm dòng + chữ ở i18n/server.
export const NOTIFY_CHANNELS = ['desktop', 'email', 'mobile'] as const;
export type NotifyChannel = (typeof NOTIFY_CHANNELS)[number];
export type NotifyTone = 'warn' | 'danger' | 'info' | 'teal';

export interface NotifyKindDef {
  group: 'msg' | 'ai' | 'system';
  /** id icon `ic-*` của packages/ui (popover chuông). */
  icon: string;
  tone: NotifyTone;
  defaults: Record<NotifyChannel, boolean>;
}

const ch = (desktop: boolean, email: boolean, mobile: boolean) => ({ desktop, email, mobile });

export const NOTIFY_KINDS = {
  msg_assigned: { group: 'msg', icon: 'ic-inbox', tone: 'info', defaults: ch(true, true, true) },
  msg_mention: { group: 'msg', icon: 'ic-users', tone: 'info', defaults: ch(true, true, true) },
  msg_vip: { group: 'msg', icon: 'ic-star', tone: 'warn', defaults: ch(true, true, true) },
  // Khách hàng (Q-012 / DC-150): khách được chuyển cho tôi · xin chia sẻ khách + kết quả duyệt.
  crm_owner: { group: 'msg', icon: 'ic-users', tone: 'info', defaults: ch(true, false, true) },
  crm_access: { group: 'msg', icon: 'ic-users', tone: 'info', defaults: ch(true, false, true) },
  // Báo giá (TIP-029): có báo giá chờ tôi duyệt · báo giá tôi phụ trách sắp hết hiệu lực (T-2).
  quote_approval: { group: 'msg', icon: 'ic-doc', tone: 'warn', defaults: ch(true, true, true) },
  quote_expiring: { group: 'msg', icon: 'ic-clock', tone: 'warn', defaults: ch(true, false, true) },
  // Hợp đồng (TIP-030): chờ tôi duyệt & ký · khách đã ký / từ chối ký · sắp hết hạn (T-30).
  contract_approval: { group: 'msg', icon: 'ic-doc', tone: 'warn', defaults: ch(true, true, true) },
  contract_signed: { group: 'msg', icon: 'ic-check', tone: 'teal', defaults: ch(true, true, true) },
  contract_declined: { group: 'msg', icon: 'ic-x', tone: 'danger', defaults: ch(true, true, true) },
  contract_expiring: { group: 'msg', icon: 'ic-clock', tone: 'warn', defaults: ch(true, false, true) },
  // Thu tiền (TIP-032): khách đã thanh toán đề nghị của tôi · yêu cầu hoàn tiền chờ tôi duyệt + kết quả duyệt · giao dịch cần đối soát.
  payment_received: { group: 'msg', icon: 'ic-dollar', tone: 'teal', defaults: ch(true, false, true) },
  refund_approval: { group: 'msg', icon: 'ic-dollar', tone: 'warn', defaults: ch(true, true, true) },
  bank_review: { group: 'msg', icon: 'ic-dollar', tone: 'warn', defaults: ch(true, false, false) },
  // Liệu trình (TIP-032b): khách còn 1 buổi / gói còn 7 ngày tới hạn — gợi ý gia hạn / mua thêm.
  package_reminder: { group: 'msg', icon: 'ic-clock', tone: 'warn', defaults: ch(true, false, true) },
  // Ticket (TIP-034): sắp đến hạn SLA (người phụ trách) · quá hạn (leo thang Chủ sở hữu + quản lý) · ticket mới giao cho tôi.
  sla_warn: { group: 'msg', icon: 'ic-bell', tone: 'danger', defaults: ch(true, false, true) },
  sla_breach: { group: 'msg', icon: 'ic-bell', tone: 'danger', defaults: ch(true, true, true) },
  ticket_assigned: { group: 'msg', icon: 'ic-users', tone: 'info', defaults: ch(true, false, true) },
  ai_review: { group: 'ai', icon: 'ic-spark', tone: 'teal', defaults: ch(true, false, false) },
  ai_escalate: { group: 'ai', icon: 'ic-bot', tone: 'warn', defaults: ch(true, true, true) },
  ai_budget: { group: 'ai', icon: 'ic-dollar', tone: 'danger', defaults: ch(false, true, false) },
  ai_briefing: { group: 'ai', icon: 'ic-spark', tone: 'teal', defaults: ch(true, false, true) },
  ai_task_failed: { group: 'ai', icon: 'ic-bot', tone: 'warn', defaults: ch(true, false, false) },
  channel_down: { group: 'system', icon: 'ic-link', tone: 'danger', defaults: ch(true, true, true) },
  billing_invoice: { group: 'system', icon: 'ic-doc', tone: 'info', defaults: ch(false, true, false) },
  // Bảo mật (TIP-045b): đổi Chủ sở hữu — báo cả Owner cũ lẫn mới.
  owner_transfer: { group: 'system', icon: 'ic-shield', tone: 'warn', defaults: ch(true, true, true) },
  // Sự kiện bảo mật khác (đổi vai trò, mời / gỡ thành viên, kết nối / ngắt kênh, xuất dữ liệu, đăng nhập thiết bị mới) → Owner.
  security_event: { group: 'system', icon: 'ic-shield', tone: 'warn', defaults: ch(true, true, false) },
} as const satisfies Record<string, NotifyKindDef>;

export type NotifyKind = keyof typeof NOTIFY_KINDS;
export const NOTIFY_KIND_KEYS = Object.keys(NOTIFY_KINDS) as NotifyKind[];
export const NOTIFY_GROUPS = ['msg', 'ai', 'system'] as const;
export const isNotifyKind = (v: string): v is NotifyKind => v in NOTIFY_KINDS;

export interface NotifyPrefsData {
  events: Partial<Record<NotifyKind, Record<NotifyChannel, boolean>>>;
  dnd: { on: boolean; from: string; to: string };
  sound: boolean;
  digest: 'off' | 'daily' | 'weekly';
}

export const DEFAULT_NOTIFY_PREFS: Omit<NotifyPrefsData, 'events'> = { dnd: { on: false, from: '22:00', to: '08:00' }, sound: true, digest: 'daily' };

/** Kênh hiệu lực của một loại cho user: tuỳ chọn đã lưu, thiếu thì mặc định danh mục. */
export const channelsFor = (prefs: Pick<NotifyPrefsData, 'events'> | null, kind: NotifyKind): Record<NotifyChannel, boolean> => ({
  ...NOTIFY_KINDS[kind].defaults,
  ...(prefs?.events[kind] ?? {}),
});

const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** Giờ không làm phiền (khung có thể qua nửa đêm: 22:00 → 08:00) theo múi giờ workspace. */
export function inQuietHours(dnd: NotifyPrefsData['dnd'], at: Date, timeZone: string): boolean {
  if (!dnd.on) return false;
  const parts = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone }).formatToParts(at);
  const h = Number(parts.find((p) => p.type === 'hour')!.value) % 24;
  const now = h * 60 + Number(parts.find((p) => p.type === 'minute')!.value);
  const from = minutes(dnd.from);
  const to = minutes(dnd.to);
  if (from === to) return false;
  return from < to ? now >= from && now < to : now >= from || now < to;
}
