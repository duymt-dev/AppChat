// Hạn mức gói (REQ-L02): số người dùng / kênh / agent theo `plan.max_*` của subscription hiện tại + tài nguyên mua thêm còn hạn (TIP-039,
// DC-056); null = không giới hạn. TIP tạo tài nguyên gọi `assert(ws, resource, current)` TRƯỚC khi thêm (013 thành viên · 014 kênh · 021 agent).
import { AppError, FREE_PLAN_KEY, type QuotaResource } from '@appchat/shared';
import type { PlatformDb } from '@appchat/db';
import { SystemClock } from '../../kernel/clock';
import { activeAddons, withAddons } from './addons.service';

const defaultClock = new SystemClock();

export interface PlanLimits {
  planKey: string;
  users: number | null;
  channels: number | null;
  agents: number | null;
}

export class QuotaService {
  constructor(
    private readonly db: Pick<PlatformDb, 'subscription' | 'plan' | 'subscriptionAddon'>,
    private readonly now: () => Date = () => defaultClock.now(),
  ) {}

  /** Workspace chưa có subscription (chưa khai báo) → hạn mức gói Miễn phí. */
  async limits(workspaceId: string): Promise<PlanLimits> {
    const s = await this.db.subscription.findUnique({ where: { workspaceId }, select: { planId: true } });
    const p = s
      ? await this.db.plan.findUnique({ where: { id: s.planId } })
      : await this.db.plan.findUnique({ where: { key: FREE_PLAN_KEY } });
    if (!p) throw new AppError('INTERNAL', 500, undefined, 'Thiếu seed gói');
    const add = await activeAddons(this.db, workspaceId, this.now());
    return { planKey: p.key, users: withAddons(p.maxUsers, 'users', add), channels: withAddons(p.maxChannels, 'channels', add), agents: p.maxAgents };
  }

  /** `current` = số đang có (không tính cái sắp thêm). Vượt → PLAN_LIMIT_REACHED 402 `{ resource, limit }`. */
  async assert(workspaceId: string, resource: QuotaResource, current: number, adding = 1): Promise<void> {
    const limit = (await this.limits(workspaceId))[resource];
    if (limit !== null && current + adding > limit) throw new AppError('PLAN_LIMIT_REACHED', 402, { resource, limit: String(limit) });
  }
}
