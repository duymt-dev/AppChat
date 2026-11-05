// Kiểu dữ liệu Khách thân thiết — hợp đồng chung `packages/shared/src/api/loyalty.ts` (mock và http cùng zod — TIP-036).
import type { LoyaltyConfigDto, LoyaltyLedgerRowDto, LoyaltyLookupDto, LoyaltyMemberDto, LoyaltyMemberFileDto, LoyaltyOverviewDto } from '@appchat/shared';

export type TierKey = 'member' | 'silver' | 'gold' | 'diamond';
export type MemberStatus = 'active' | 'inactive' | 'new' | 'churn_risk';

export type LedgerRow = LoyaltyLedgerRowDto;
export type Member = LoyaltyMemberDto;
export type LoyaltyConfig = LoyaltyConfigDto;
export type LoyaltyOverview = LoyaltyOverviewDto;
export type Lookup = LoyaltyLookupDto;
export type MemberFile = LoyaltyMemberFileDto;

export interface MemberFilter {
  tier: TierKey | 'all';
  q: string;
}
