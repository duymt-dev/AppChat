// Hạn mức gói (REQ-L02): số người dùng / kênh / agent theo `plan.max_*` của subscription hiện tại; null = không giới hạn.
// TIP tạo tài nguyên gọi `assert(ws, resource, current)` TRƯỚC khi thêm (013 thành viên · 014 kênh · 021 agent).
import { AppError, FREE_PLAN_KEY, type QuotaResource } from '@appchat/shared';
import type { PlatformDb } from '@appchat/db';

export interface PlanLimits {
  planKey: string;
  users: number | null;
  channels: number | null;
  agents: number | null;
}

export class QuotaService {
  constructor(private readonly db: Pick<PlatformDb, 'subscription' | 'plan'>) {}

  /** Workspace chưa có subscription (chưa khai báo) → hạn mức gói Miễn phí. */
  async limits(workspaceId: string): Promise<PlanLimits> {
    const s = await this.db.subscription.findUnique({ where: { workspaceId }, select: { planId: true } });
    const p = s
      ? await this.db.plan.findUnique({ where: { id: s.planId } })
      : await this.db.plan.findUnique({ where: { key: FREE_PLAN_KEY } });
    if (!p) throw new AppError('INTERNAL', 500, undefined, 'Thiếu seed gói');
    return { planKey: p.key, users: p.maxUsers, channels: p.maxChannels, agents: p.maxAgents };
  }

  /** `current` = số đang có (không tính cái sắp thêm). Vượt → PLAN_LIMIT_REACHED 402 `{ resource, limit }`. */
  async assert(workspaceId: string, resource: QuotaResource, current: number, adding = 1): Promise<void> {
    const limit = (await this.limits(workspaceId))[resource];
    if (limit !== null && current + adding > limit) throw new AppError('PLAN_LIMIT_REACHED', 402, { resource, limit: String(limit) });
  }
}
