// Kiểu dữ liệu Khách thân thiết — khớp mock /loyalty/* (Blueprint §2.2 loyalty_config / loyalty_ledger, §4.4 loyalty).
export type TierKey = 'member' | 'silver' | 'gold' | 'diamond';
export type MemberStatus = 'active' | 'inactive' | 'new' | 'churn_risk';

export interface LedgerRow {
  kind: 'earn' | 'redeem' | 'adjust' | 'expire' | 'reverse' | string;
  text: string;
  delta: number;
  at: string;
}

export interface Member {
  contact_id: string;
  name: string;
  phone: string;
  tier: TierKey | string;
  points: number;
  earned: number;
  used: number;
  /** VND string (response-envelope: tiền là string). */
  spent: string;
  status: MemberStatus | string;
  joined: string;
  expiring: number;
  ledger: LedgerRow[];
}

export interface LoyaltyConfig {
  enabled: boolean;
  earn_vnd_per_point: number;
  redeem_vnd_per_point: number;
  max_redeem_pct: number;
  expiry_months: number;
  tier_window_months: number;
  tier_review: string;
  marketplace_earn: boolean;
  tiers: { key: TierKey | string; min: number; mult: number }[];
}

export interface LoyaltyOverview {
  now: string;
  /** [key, giá trị, đơn vị, xu hướng] */
  overview: [string, string, string, string][];
  /** [tên, SĐT, hạng, mức rủi ro, điểm rủi ro, dấu hiệu, lần cuối] */
  churn: [string, string, string, string, number, string, string][];
  /** [key, sự kiện, điều kiện, cách tính, hạn dùng, trạng thái on | soon] */
  rules: [string, string, string, string, string, string][];
  files: [string, string, string][];
}

export interface Lookup {
  member: Member | null;
  contact: { id: string; name: string } | null;
}

export interface MemberFilter {
  tier: TierKey | 'all';
  q: string;
}
