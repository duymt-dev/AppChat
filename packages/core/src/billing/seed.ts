// Seed bảng `plan` ở DB nền tảng theo PLAN_SEEDS (prototype) — idempotent theo `key`; chỉ tạo gói thiếu, KHÔNG ghi đè gói
// đã có (Quản trị nền tảng có thể đã sửa giá / hạn mức — TIP-040). Gọi khi boot api / worker và trong test.
import { FREE_ARCHIVE_INACTIVE_DAYS, FREE_PLAN_KEY, PLAN_SEEDS, TRIAL_PLAN_KEY } from '@appchat/shared';
import type { PlatformDb } from '@appchat/db';
import { uuidv7 } from '../kernel/ids';

export async function seedPlans(db: Pick<PlatformDb, 'plan'>): Promise<number> {
  const have = new Set((await db.plan.findMany({ select: { key: true } })).map((p) => p.key));
  const missing = PLAN_SEEDS.filter((p) => !have.has(p.key));
  if (!missing.length) return 0;
  const r = await db.plan.createMany({
    data: missing.map((p) => ({
      id: uuidv7(),
      key: p.key,
      segment: p.segment,
      name: p.name,
      priceMonth: p.price_month === null ? null : BigInt(p.price_month),
      creditsMonth: p.credits_month === null ? null : BigInt(p.credits_month),
      maxUsers: p.max_users,
      maxChannels: p.max_channels,
      maxAgents: p.max_agents,
      features: { desc: p.desc, popular: p.popular, features: p.features },
      isTrialPlan: p.key === TRIAL_PLAN_KEY,
      archiveInactiveDays: p.key === FREE_PLAN_KEY ? FREE_ARCHIVE_INACTIVE_DAYS : null,
      sort: p.sort,
    })),
    skipDuplicates: true,
  });
  return r.count;
}
