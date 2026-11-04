// Toán Khách thân thiết dùng chung server / mock / màn mô phỏng (COMMERCE §7 — luật đã chốt, không cấu hình được ngoài hệ số hạng):
// tích floor(net trước VAT / 10.000) × hệ số hạng (làm tròn xuống), 1 điểm = 100đ, đổi tối đa 50% giá trị đơn, hạn 12 tháng,
// hạng theo điểm tích 12 tháng (0 / 5.000 / 15.000 / 40.000). Đảo khi hoàn một phần: theo tỉ lệ luỹ kế (tránh trôi do làm tròn).
export const TIER_KEYS = ['member', 'silver', 'gold', 'diamond'] as const;
export type LoyaltyTierKey = (typeof TIER_KEYS)[number];
export interface LoyaltyTier {
  key: LoyaltyTierKey | string;
  min: number;
  mult: number;
}

export const EARN_VND_PER_POINT = 10_000n;
export const REDEEM_VND_PER_POINT = 100n;
export const MAX_REDEEM_PCT = 50n;
export const EXPIRY_MONTHS = 12;
export const DEFAULT_TIERS: readonly LoyaltyTier[] = [
  { key: 'member', min: 0, mult: 1 },
  { key: 'silver', min: 5000, mult: 1 },
  { key: 'gold', min: 15000, mult: 1.5 },
  { key: 'diamond', min: 40000, mult: 2 },
];

const multOf = (tiers: readonly LoyaltyTier[], key: string | null | undefined) => tiers.find((t) => t.key === key)?.mult ?? tiers[0]?.mult ?? 1;

/** Điểm tích của một đơn: floor(floor(net / 10.000) × hệ số). Hệ số có một chữ số thập phân (1 / 1,5 / 2) → tính nguyên theo phần mười. */
export function earnPoints(netBeforeVat: bigint | string, tierKey: string | null | undefined, tiers: readonly LoyaltyTier[] = DEFAULT_TIERS): { base: number; mult: number; points: number } {
  const net = BigInt(netBeforeVat);
  const base = net > 0n ? net / EARN_VND_PER_POINT : 0n;
  const mult = multOf(tiers, tierKey);
  const tenths = BigInt(Math.round(mult * 10));
  return { base: Number(base), mult, points: Number((base * tenths) / 10n) };
}

/** Hạng theo điểm tích trong cửa sổ (ngưỡng tăng dần). */
export function tierFor(earnedInWindow: number | bigint, tiers: readonly LoyaltyTier[] = DEFAULT_TIERS): string {
  const e = Number(earnedInWindow);
  return [...tiers].sort((a, b) => a.min - b.min).reduce((hit, t) => (e >= t.min ? t.key : hit), tiers[0]?.key ?? 'member');
}

/** Số tiền của `points` điểm. */
export const pointsValue = (points: number | bigint) => BigInt(points) * REDEEM_VND_PER_POINT;

/** Tổng điểm tối đa được dùng trên đơn tổng `orderTotal` (50% giá trị đơn, làm tròn xuống theo điểm). */
export const maxRedeemPoints = (orderTotal: bigint | string) => (BigInt(orderTotal) * MAX_REDEEM_PCT) / 100n / REDEEM_VND_PER_POINT;

/**
 * Điểm đảo thêm khi hoàn tiền: tổng phải đảo theo tỉ lệ luỹ kế (đã hoàn / đã thu) trừ phần đã đảo trước — không vượt điểm tích gốc.
 * Hoàn đủ → đảo hết; hai lần hoàn một phần cộng lại không lệch do làm tròn.
 */
export function reversalDelta(earned: number | bigint, refundedTotal: bigint, paidBase: bigint, alreadyReversed: number | bigint): bigint {
  const e = BigInt(earned);
  if (e <= 0n || paidBase <= 0n) return 0n;
  const ratio = refundedTotal >= paidBase ? e : (e * refundedTotal) / paidBase;
  const target = ratio > e ? e : ratio;
  const d = target - BigInt(alreadyReversed);
  return d > 0n ? d : 0n;
}

/** Thời điểm hết hạn của lô cộng tại `at` (12 tháng — cùng ngày tháng, UTC). */
export function expiryOf(at: Date, months = EXPIRY_MONTHS): Date {
  const d = new Date(at.getTime());
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

/** Đầu quý (ngày lịch `YYYY-MM-DD`) chứa ngày `day` — mốc xét hạng. */
export function quarterStart(day: string): string {
  const [y, m] = day.split('-').map(Number) as [number, number];
  const q = Math.floor((m - 1) / 3) * 3 + 1;
  return `${y}-${String(q).padStart(2, '0')}-01`;
}

/** Điểm là số nguyên an toàn ở JSON number. */
export const safePoints = (v: bigint) => {
  if (v > BigInt(Number.MAX_SAFE_INTEGER) || v < BigInt(Number.MIN_SAFE_INTEGER)) throw new RangeError('points_out_of_range');
  return Number(v);
};
