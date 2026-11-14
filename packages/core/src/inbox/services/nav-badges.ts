// Số đếm trên rail (TIP-016b, prototype L1089): `GET /v1/nav/badges` → `{ inbox, tickets, calendar }` của NGƯỜI XEM. Mỗi số là một COUNT
// trong data scope module (cùng điều kiện SQL với list / get — không lộ bản ghi ngoài scope); thiếu quyền xem module → không có khoá đó.
// - inbox: hội thoại đang hiện (cùng nghĩa thư mục Hộp thư) còn tin chưa đọc — index partial `conversation_unread_live_idx`.
// - tickets: ticket đang chạy SLA (open / in_progress — "Đang chờ" khách đã dừng SLA) — index partial `ticket_open_ttr_idx`.
// - calendar: lịch hẹn hôm nay theo múi giờ workspace, trừ đã huỷ (= KPI "Hôm nay" màn Lịch hẹn) — index `appointment_start_idx`.
// Cache 15 giây theo (workspace, user, quyền) trong tiến trình; sự kiện realtime đổi số (tin mới / đọc / ticket / lịch hẹn) đi qua gateway
// của MỌI node API → `touchNavBadges` tăng thế hệ workspace → lần đọc kế tiếp (FE vừa invalidate) tính lại, không trả số cũ (DC-450).
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import { can, utcToWall, wallToUtc, type AuthzContext, type NavBadgesDto, type PermissionKey } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { supportScopeSql } from '../../support/ticket-access';
import { bookingScopeSql } from '../../booking/booking-access';
import { convScopeSql } from './access';

export interface NavViewer {
  workspaceId: string;
  userId: string;
  authz: AuthzContext;
}

export const NAV_BADGES_TTL_MS = 15_000;
const MAX_ENTRIES = 5_000;
const PERMS = ['inbox.view', 'ticket.view', 'booking.view'] as const satisfies readonly PermissionKey[];

/** Event WS (tên phía client) làm đổi số trên rail — cùng tập FE invalidate `qk.navBadges()`. */
export const NAV_BADGE_EVENTS: ReadonlySet<string> = new Set(['message.new', 'message.updated', 'conversation.updated', 'ticket.updated', 'appointment.updated']);

const generations = new Map<string, number>();

/** Gateway gọi với mỗi envelope realtime nhận được: event đổi số → bỏ cache số đếm của workspace ở node này. */
export function touchNavBadges(workspaceId: string, event: string): void {
  if (!NAV_BADGE_EVENTS.has(event)) return;
  if (generations.size >= MAX_ENTRIES && !generations.has(workspaceId)) generations.clear();
  generations.set(workspaceId, (generations.get(workspaceId) ?? 0) + 1);
}

const n = (rows: { n: bigint }[]) => Number(rows[0]?.n ?? 0);

/** Hội thoại đang hiện còn tin chưa đọc (cùng `live` của Hộp thư) trong scope inbox. */
export const unreadConversations = async (tx: TenantTx, authz: AuthzContext, now: Date) =>
  n(await tx.$queryRaw<{ n: bigint }[]>`
    SELECT count(*)::bigint AS n FROM conversation cv
    WHERE cv.unread_count > 0 AND cv.archived_at IS NULL AND cv.hidden_at IS NULL AND cv.status <> 'closed'
      AND (cv.status <> 'snoozed' OR cv.snoozed_until IS NULL OR cv.snoozed_until <= ${now}) AND ${convScopeSql(authz)}`);

/** Ticket đang chạy SLA trong scope support. */
export const openTickets = async (tx: TenantTx, authz: AuthzContext) =>
  n(await tx.$queryRaw<{ n: bigint }[]>`SELECT count(*)::bigint AS n FROM ticket t WHERE t.status IN ('open', 'in_progress') AND ${supportScopeSql(authz)}`);

/** Lịch hẹn bắt đầu trong [from, to), chưa huỷ, trong scope booking. */
export const appointmentsBetween = async (tx: TenantTx, authz: AuthzContext, from: Date, to: Date) =>
  n(await tx.$queryRaw<{ n: bigint }[]>`
    SELECT count(*)::bigint AS n FROM appointment a
    WHERE a.deleted_at IS NULL AND a.start_at >= ${from} AND a.start_at < ${to} AND a.status <> 'cancelled' AND ${bookingScopeSql(authz)}`);

export class NavBadgesService {
  private readonly cache = new Map<string, { at: number; gen: number; data: NavBadgesDto }>();

  constructor(
    private readonly tenants: TenantDbResolver,
    private readonly platform: Pick<PlatformDb, 'workspace'>,
    private readonly now: () => Date,
  ) {}

  async read(v: NavViewer): Promise<NavBadgesDto> {
    const key = `${v.workspaceId}:${v.userId}:${keyOf(v.authz)}`;
    const t = this.now().getTime();
    const gen = generations.get(v.workspaceId) ?? 0;
    const hit = this.cache.get(key);
    if (hit && hit.gen === gen && t - hit.at < NAV_BADGES_TTL_MS) return hit.data;
    const data = await this.count(v);
    if (this.cache.size >= MAX_ENTRIES) this.cache.clear();
    this.cache.set(key, { at: t, gen, data });
    return data;
  }

  private async count(v: NavViewer): Promise<NavBadgesDto> {
    const a = v.authz;
    const [inbox, tickets, calendar] = PERMS.map((p) => can(a, p));
    if (!inbox && !tickets && !calendar) return {};
    const now = this.now();
    const day = calendar ? await this.today(v.workspaceId, now) : null;
    const db = await this.tenants.get(TenantContexts.fromMembership(v.workspaceId, v.userId));
    return db.$transaction(async (tx) => {
      const out: NavBadgesDto = {};
      if (inbox) out.inbox = await unreadConversations(tx, a, now);
      if (tickets) out.tickets = await openTickets(tx, a);
      if (day) out.calendar = await appointmentsBetween(tx, a, day.from, day.to);
      return out;
    });
  }

  /** [00:00 hôm nay, 00:00 ngày mai) theo múi giờ workspace — cùng cách tính KPI "Hôm nay" của màn Lịch hẹn. */
  private async today(ws: string, now: Date) {
    const w = await this.platform.workspace.findUnique({ where: { id: ws }, select: { timezone: true } });
    const tz = w?.timezone ?? 'Asia/Ho_Chi_Minh';
    const date = utcToWall(now, tz).date;
    return { from: wallToUtc(date, '00:00', tz), to: wallToUtc(nextDay(date), '00:00', tz) };
  }
}

/** Đổi vai trò / scope / nhóm → khoá cache khác (không trả số theo quyền cũ). */
const keyOf = (a: AuthzContext) =>
  [a.isOwner ? 'o' : '', PERMS.map((p) => (can(a, p) ? 1 : 0)).join(''), a.scope?.inbox, a.scope?.support, a.scope?.booking, a.teamIds.join(',')].join(':');

function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
