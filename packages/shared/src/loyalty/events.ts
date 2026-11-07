// Event domain loyalty (TIP-036, Blueprint §2.3): số dư đổi (FE làm mới, thông báo), cấu hình đổi, hạng đổi. Payload không chứa PII ngoài id.
import { z } from 'zod';

const base = { ws: z.string().uuid(), occurred_at: z.string() };

export const loyaltyPointsChangedEvent = z.object({
  ...base,
  contact_id: z.string().uuid(),
  kind: z.enum(['earn', 'redeem', 'adjust', 'expire', 'reverse', 'restore']),
  delta: z.number().int(),
  balance_after: z.number().int(),
  ledger_id: z.string().uuid(),
});
export const loyaltyConfigChangedEvent = z.object({
  ...base,
  version: z.number().int(),
  enabled: z.boolean().optional(),
  marketplace_earn: z.boolean().optional(),
  tiers: z.array(z.object({ key: z.string(), mult: z.number() })).optional(),
});
export const loyaltyTierChangedEvent = z.object({ ...base, contact_id: z.string().uuid(), from: z.string(), to: z.string(), quarter: z.string() });

export const LOYALTY_EVENT_SCHEMAS = {
  'loyalty.points_changed': loyaltyPointsChangedEvent,
  'loyalty.config_changed': loyaltyConfigChangedEvent,
  'loyalty.tier_changed': loyaltyTierChangedEvent,
} as const;
