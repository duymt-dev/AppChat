// Cấu hình loyalty (TIP-036): một dòng `loyalty_config` (id = 1) — seed khi provision (registry DC-026) và bù ở migration cho tenant cũ.
// Đọc thiếu dòng (DB lỗi seed) → tự bù idempotent. Tỉ lệ / hạn / trần / ngưỡng hạng là luật COMMERCE §7 — chỉ hệ số hạng, bật / tắt, đơn sàn
// có tích điểm đổi được (loyalty.update_config).
import { DEFAULT_TIERS, type LoyaltyTier } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';

export interface LoyaltyConf {
  enabled: boolean;
  earnVndPerPoint: number;
  redeemVndPerPoint: number;
  tiers: LoyaltyTier[];
  expiryMonths: number;
  maxRedeemPct: number;
  tierWindowMonths: number;
  tierReview: string;
  marketplaceEarn: boolean;
  version: number;
}

type Db = Pick<TenantTx, 'loyaltyConfig'>;

export async function ensureConfig(db: Db): Promise<void> {
  await db.loyaltyConfig.upsert({ where: { id: 1 }, create: { id: 1, tiers: DEFAULT_TIERS as never }, update: {} });
}

export async function readConfig(db: Db): Promise<LoyaltyConf> {
  let c = await db.loyaltyConfig.findUnique({ where: { id: 1 } });
  if (!c) {
    await ensureConfig(db);
    c = await db.loyaltyConfig.findUniqueOrThrow({ where: { id: 1 } });
  }
  return { ...c, tiers: c.tiers as unknown as LoyaltyTier[] };
}

export const configDto = (c: LoyaltyConf) => ({
  enabled: c.enabled,
  earn_vnd_per_point: c.earnVndPerPoint,
  redeem_vnd_per_point: c.redeemVndPerPoint,
  max_redeem_pct: c.maxRedeemPct,
  expiry_months: c.expiryMonths,
  tier_window_months: c.tierWindowMonths,
  tier_review: c.tierReview,
  marketplace_earn: c.marketplaceEarn,
  tiers: c.tiers.map((t) => ({ key: String(t.key), min: t.min, mult: t.mult })),
});
