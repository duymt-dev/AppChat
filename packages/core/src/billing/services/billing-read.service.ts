// Đọc billing (Blueprint §4.4 billing): summary (gói, hạn, hạn mức + đã dùng, credit), catalog gói, ví + lịch sử (cursor).
// Shape theo packages/shared/src/api/billing.ts; chữ lịch sử ví render theo locale người xem (i18n/server billing).
import {
  ADDONS,
  AppError,
  CREDIT_PACKS,
  PLAN_COMPARE,
  interpolate,
  serverMessages,
  type BillingSummaryDto,
  type LedgerEntryDto,
} from '@appchat/shared';
import type { PlatformDb } from '@appchat/db';
import { activeAddons, withAddons } from './addons.service';
import { LEDGER_PAGE, readLedger, type LedgerFilter, type LedgerRow } from './ledger-reader';

export { LEDGER_PAGE };

const DAY = 86_400_000;
/** Đơn giá credit nạp (gói credit_500 = 500 credit / 500.000đ) — quy đổi số dư nạp sang VND cho `/me` (DC-033). */
export const CREDIT_VND = 1000;

export function ledgerDto(r: LedgerRow, locale: string): LedgerEntryDto {
  const m = serverMessages(locale).billing;
  const tpl = (r.note && (m.ledger as Record<string, string>)[r.note]) || (m.ledger as Record<string, string>)[r.kind] || r.kind;
  return {
    id: r.id,
    at: r.createdAt.toISOString(),
    desc: interpolate(tpl, (r.meta ?? {}) as Record<string, string | number>),
    kind: r.kind as LedgerEntryDto['kind'],
    source: (r.source && (m.source as Record<string, string>)[r.source]) || r.source || '',
    delta: Number(r.delta),
  };
}

/** Số kênh đang tính hạn mức ở DB tenant (kênh chưa ngắt — cùng quy tắc `quota.assert` của kết nối kênh). */
export type ChannelCounter = (workspaceId: string) => Promise<number>;

export class BillingReadService {
  constructor(
    private readonly db: PlatformDb,
    private readonly now: () => Date,
    private readonly channelCount: ChannelCounter | null = null,
  ) {}

  /** Kênh dùng = tài khoản kênh chưa ngắt (tenant) + chỗ đang giữ của thao tác kết nối chưa xong (nền tảng). Lỗi đọc tenant → unavailable. */
  private async channelsUsed(workspaceId: string): Promise<{ used: number; available: boolean }> {
    if (!this.channelCount) return { used: 0, available: false };
    try {
      const [live, held] = await Promise.all([this.channelCount(workspaceId), this.db.quotaReservation.count({ where: { workspaceId, resource: 'channels', status: 'reserved' } })]);
      return { used: live + held, available: true };
    } catch {
      return { used: 0, available: false };
    }
  }

  async summary(workspaceId: string): Promise<BillingSummaryDto> {
    const [sub, wallet, users, channels] = await Promise.all([
      this.db.subscription.findUnique({ where: { workspaceId } }),
      this.db.creditWallet.findUnique({ where: { workspaceId } }),
      this.db.membership.count({ where: { workspaceId, status: 'active' } }),
      this.channelsUsed(workspaceId),
    ]);
    const add = await activeAddons(this.db, workspaceId, this.now());
    const plan = sub ? await this.db.plan.findUnique({ where: { id: sub.planId } }) : await this.db.plan.findUnique({ where: { key: 'free' } });
    if (!plan) throw new AppError('INTERNAL', 500, undefined, 'Thiếu seed gói');
    const now = this.now().getTime();
    const start = sub?.currentPeriodStart ?? (await this.db.workspace.findUnique({ where: { id: workspaceId }, select: { createdAt: true } }))?.createdAt ?? new Date(now);
    const end = sub?.status === 'trialing' ? sub.trialEndsAt : (sub?.currentPeriodEnd ?? null);
    const span = end ? end.getTime() - start.getTime() : 0;
    const planBalance = Number(wallet?.planBalance ?? 0n);
    const topupBalance = Number(wallet?.topupBalance ?? 0n);
    return {
      plan_key: plan.key,
      plan_name: plan.name,
      status: sub?.status ?? 'active',
      activated_at: start.toISOString().slice(0, 10),
      expires_at: end ? end.toISOString().slice(0, 10) : null,
      days_left: end ? Math.max(0, Math.ceil((end.getTime() - now) / DAY)) : 0,
      period_pct: span > 0 ? Math.min(100, Math.max(0, Math.round(((now - start.getTime()) / span) * 100))) : 0,
      // Hạn mức hiển thị = gói + addon còn hạn (TIP-039) — cùng số `quota.assert` dùng.
      users: { used: users, max: withAddons(plan.maxUsers, 'users', add) },
      channels: { used: channels.used, max: withAddons(plan.maxChannels, 'channels', add), available: channels.available },
      credits_month: plan.creditsMonth === null ? null : Number(plan.creditsMonth),
      balance: planBalance + topupBalance,
      plan_balance: planBalance,
      topup_balance: topupBalance,
      retain_until: sub?.status === 'expired' && sub.retainUntil ? sub.retainUntil.toISOString().slice(0, 10) : null,
    };
  }

  /** Catalog gói từ bảng `plan` (active) + bảng so sánh / gói credit / tài nguyên từ cấu hình (DC-032). */
  async catalog() {
    const rows = await this.db.plan.findMany({ where: { active: true }, orderBy: { sort: 'asc' } });
    const card = (p: (typeof rows)[number]) => {
      const f = (p.features ?? {}) as { desc?: string; popular?: boolean; features?: string[] };
      return {
        key: p.key,
        name: p.name,
        price: p.priceMonth === null ? null : String(p.priceMonth),
        period: p.priceMonth === null || p.priceMonth === 0n ? ('' as const) : ('month' as const),
        desc: f.desc ?? '',
        popular: f.popular ?? false,
        features: f.features ?? [],
      };
    };
    return {
      plans: { personal: rows.filter((p) => p.segment === 'personal').map(card), business: rows.filter((p) => p.segment === 'business').map(card) },
      compare: PLAN_COMPARE,
      credit_packs: CREDIT_PACKS,
      addons: ADDONS,
    };
  }

  /** Lịch sử ví có lọc server-side (TIP-039) — `ledger-reader.ts`. Bộ lọc rỗng = như trước. */
  async ledger(workspaceId: string, locale: string, cursor?: string, limit = LEDGER_PAGE, filter: LedgerFilter = {}) {
    const { rows, next } = await readLedger(this.db, workspaceId, filter, cursor, limit);
    return { data: rows.map((r) => ledgerDto(r, locale)), next_cursor: next };
  }

  /**
   * Phần billing của `GET /v1/me` (DC-020, DC-033): mỗi workspace `plan` (tên gói) + `trial_ends_at`; workspace đang dùng →
   * `billing { trial_days_left, paid_plan, wallet_balance }` — wallet_balance = credit nạp × 1.000đ (đơn giá gói credit).
   */
  async forMe(workspaceIds: readonly string[], current: string | null) {
    const subs = await this.db.subscription.findMany({ where: { workspaceId: { in: [...workspaceIds] } } });
    const plans = new Map((await this.db.plan.findMany({ where: { id: { in: subs.map((x) => x.planId) } } })).map((p) => [p.id, p]));
    const per = new Map(subs.map((x) => [x.workspaceId, { sub: x, plan: plans.get(x.planId) }]));
    const now = this.now().getTime();
    const cur = current ? per.get(current) : undefined;
    const wallet = current ? await this.db.creditWallet.findUnique({ where: { workspaceId: current } }) : null;
    const trialEnds = cur?.sub.status === 'trialing' ? cur.sub.trialEndsAt : null;
    return {
      workspaces: Object.fromEntries(
        workspaceIds.map((id) => {
          const x = per.get(id);
          return [
            id,
            {
              plan: x?.plan?.name ?? null,
              plan_key: x?.plan?.key ?? null,
              segment: x?.plan?.segment ?? null,
              trial_ends_at: x?.sub.status === 'trialing' ? (x.sub.trialEndsAt?.toISOString() ?? null) : null,
            },
          ];
        }),
      ),
      billing: {
        trial_days_left: trialEnds ? Math.max(0, Math.ceil((trialEnds.getTime() - now) / DAY)) : 0,
        paid_plan: cur && cur.sub.status === 'active' && cur.plan && cur.plan.key !== 'free' ? cur.plan.key : '',
        wallet_balance: String(Number(wallet?.topupBalance ?? 0n) * CREDIT_VND),
      },
    };
  }

  /**
   * Trạng thái trial cho `GET /v1/session` (TIP-011): chưa có subscription → `started:false` (consumer `billing.trial` chưa chạy);
   * `trialing` → số ngày còn lại; `expired` = đã từng trial và đang ở gói Miễn phí (gói trả phí không bị nhắc hết trial).
   */
  async trialState(workspaceId: string) {
    const sub = await this.db.subscription.findUnique({ where: { workspaceId } });
    if (!sub) return { started: false, daysLeft: 0, endsAt: 0, expired: false };
    const now = this.now().getTime();
    const ends = sub.trialEndsAt?.getTime() ?? 0;
    if (sub.status === 'trialing') return { started: true, daysLeft: Math.max(0, Math.ceil((ends - now) / DAY)), endsAt: ends, expired: ends <= now };
    const plan = await this.db.plan.findUnique({ where: { id: sub.planId }, select: { key: true } });
    return { started: true, daysLeft: 0, endsAt: ends, expired: !!sub.trialStartedAt && plan?.key === 'free' };
  }

  /** Ví: số dư + 50 dòng gần nhất + ước tính số ngày còn dùng được (theo mức dùng 7 ngày qua). */
  async wallet(workspaceId: string, locale: string) {
    const w = await this.db.creditWallet.findUnique({ where: { workspaceId } });
    const since = new Date(this.now().getTime() - 7 * DAY);
    const used = await this.db.creditLedger.aggregate({ where: { workspaceId, kind: 'usage', createdAt: { gte: since } }, _sum: { delta: true } });
    const perDay = Math.abs(Number(used._sum.delta ?? 0n)) / 7;
    const total = Number((w?.planBalance ?? 0n) + (w?.topupBalance ?? 0n));
    return {
      plan_balance: Number(w?.planBalance ?? 0n),
      topup_balance: Number(w?.topupBalance ?? 0n),
      // Chưa dùng gì 7 ngày qua → không ước tính được (0 = FE hiện "—"); có dùng → số ngày, tối đa 999.
      days_estimate: perDay > 0 ? Math.min(999, Math.floor(total / perDay)) : 0,
      low_alert: w?.lowAlert ?? true,
      ledger: (await this.ledger(workspaceId, locale)).data,
    };
  }
}
