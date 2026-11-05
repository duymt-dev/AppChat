// Kiểu FE chia lead (TIP-042b) — nháp trình sửa rule + dựng nháp từ rule server.
import type { LeadRoutingMode, LeadRoutingRuleDto } from '@appchat/shared';

export interface RoutingDraft {
  /** null = rule mặc định. */
  accountId: string | null;
  ruleId?: string;
  version?: number;
  enabled: boolean;
  mode: LeadRoutingMode;
  pool: 'users' | 'team';
  userIds: string[];
  teamId: string | null;
  fixedUserId: string | null;
}

export const draftOfRule = (accountId: string | null, r?: LeadRoutingRuleDto): RoutingDraft => ({
  accountId,
  ruleId: r?.id,
  version: r?.version,
  enabled: r?.enabled ?? false,
  mode: r?.mode ?? (accountId ? 'manual' : 'round_robin'),
  pool: r?.team_id ? 'team' : 'users',
  userIds: r?.user_ids ?? [],
  teamId: r?.team_id ?? null,
  fixedUserId: r?.fixed_user_id ?? null,
});
