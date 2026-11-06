// `GET /v1/dashboard` (Blueprint §4.4 dashboard, TIP-038 pha 2 — AC04): một transaction tenant theo membership người xem (không quyền hệ
// thống) + đọc nền tảng (onboarding / ví / giờ workspace). Mỗi khối kiểm quyền + scope riêng; khối catalog (modules / cdp / news / kênh gửi
// ra / nền dữ liệu) là danh mục tĩnh có nhãn — không phải chỉ số. Ví Credit chỉ cho `billing.manage` (Owner) — người khác `credit: null`.
import { Inject, Injectable, Optional } from '@nestjs/common';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import { AppError, NOTIFY_KINDS, can, serverMessages, type AuthzContext, type DashboardDto } from '@appchat/shared';
import { CLOCK, type Clock } from '../../kernel/clock';
import { PLATFORM_DB, TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import { agentsBlock, aiTodayBlock, connectBlock, followUpBlock, notificationsBlock, statsBlock } from './dashboard-blocks';
import { workItems } from './work-items';

export interface DashboardViewer {
  workspaceId: string;
  userId: string;
  authz: AuthzContext;
}

const STEPS = ['channel', 'ai', 'team', 'template', 'sla'] as const;
const DAY = 86_400_000;
const LOW = 100;

@Injectable()
export class DashboardService {
  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants?: TenantDbResolver,
    @Optional() @Inject(PLATFORM_DB) private readonly platform?: PlatformDb,
  ) {}

  async read(v: DashboardViewer): Promise<DashboardDto> {
    if (!this.tenants || !this.platform) throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'DB chưa cấu hình');
    const now = this.clock.now();
    const [ws, user] = await Promise.all([
      this.platform.workspace.findUnique({ where: { id: v.workspaceId }, select: { timezone: true, settings: true } }),
      this.platform.user.findUnique({ where: { id: v.userId }, select: { locale: true } }),
    ]);
    const place = { timeZone: ws?.timezone ?? 'Asia/Ho_Chi_Minh', locale: user?.locale ?? 'vi' };
    const m = serverMessages(place.locale).insights.catalog;
    const done = ((ws?.settings as Record<string, unknown> | null)?.onboarding_steps ?? {}) as Record<string, boolean>;
    const credit = await this.credit(v, now);
    const db = await this.tenants.get(TenantContexts.fromMembership(v.workspaceId, v.userId));
    return db.$transaction(async (tx) => {
      const [follow, work, ai, connect, agents, notifications] = await Promise.all([
        followUpBlock(tx, v.authz, now, place),
        workItems(tx, v.authz, now, place),
        aiTodayBlock(tx, v.authz, now, place),
        connectBlock(tx, v.authz, now, place, m),
        agentsBlock(tx, v.authz, now, place),
        notificationsBlock(tx, v.userId, now, place, NOTIFY_KINDS as Record<string, { icon: string; tone: string }>),
      ]);
      const approvals = work.filter((w) => w.type === 'approval').length;
      return {
        stats: await statsBlock(tx, v.authz, now, place, ai, approvals),
        connect_groups: connect,
        agents,
        modules: m.modules,
        cdp: m.cdp,
        onboarding: { steps: STEPS.map((key) => ({ key, ...m.steps[key], done: !!done[key] })), done_count: STEPS.filter((k) => done[k]).length },
        follow_ups: follow.items,
        follow_up_count: follow.total,
        my_work: work,
        ai_today: ai,
        credit,
        news: [],
        notifications,
      };
    });
  }

  /** Ví Credit (nền tảng): chỉ người quản lý ví — số dư + ước tính số ngày theo mức dùng 7 ngày. */
  private async credit(v: DashboardViewer, now: Date): Promise<DashboardDto['credit']> {
    if (!can(v.authz, 'billing.manage')) return null;
    const w = await this.platform!.creditWallet.findUnique({ where: { workspaceId: v.workspaceId }, select: { planBalance: true, topupBalance: true } });
    const used = await this.platform!.creditLedger.aggregate({ where: { workspaceId: v.workspaceId, kind: 'usage', createdAt: { gte: new Date(now.getTime() - 7 * DAY) } }, _sum: { delta: true } });
    const balance = Number((w?.planBalance ?? 0n) + (w?.topupBalance ?? 0n));
    const perDay = Math.abs(Number(used._sum.delta ?? 0n)) / 7;
    return { balance, days_estimate: perDay > 0 ? Math.min(999, Math.floor(balance / perDay)) : 0, low: balance <= LOW };
  }
}
