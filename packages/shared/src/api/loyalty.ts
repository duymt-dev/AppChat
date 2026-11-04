// Hợp đồng dữ liệu Khách thân thiết (TIP-036, Blueprint §4.4 loyalty): `GET /v1/loyalty/config`, `/members?tier=&q=&page=&limit=` (D42),
// `/members/:contactId`, `/members/:contactId/ledger?cursor=`, `/overview`, `/lookup?phone=`. Tiền là chuỗi VND, điểm là số nguyên an toàn,
// ngày ISO. Giữ shape màn hiện có (mock fixture), field mới là bổ sung tương thích. Mock và http cùng schema.
import { z } from 'zod';

export const loyaltyTierSchema = z.object({ key: z.string(), min: z.number().int(), mult: z.number() });

export const loyaltyConfigSchema = z.object({
  enabled: z.boolean(),
  earn_vnd_per_point: z.number().int(),
  redeem_vnd_per_point: z.number().int(),
  max_redeem_pct: z.number().int(),
  expiry_months: z.number().int(),
  tier_window_months: z.number().int(),
  tier_review: z.string(),
  marketplace_earn: z.boolean(),
  tiers: z.array(loyaltyTierSchema),
});

export const loyaltyLedgerRowSchema = z.object({
  /** earn | redeem | adjust | expire | reverse | restore */
  kind: z.string(),
  text: z.string(),
  delta: z.number().int(),
  at: z.string(),
  id: z.string().optional(),
  balance_after: z.number().int().optional(),
  ref: z.object({ type: z.string(), id: z.string(), code: z.string().optional() }).nullable().optional(),
  expires_at: z.string().nullable().optional(),
});

export const loyaltyMemberSchema = z.object({
  contact_id: z.string(),
  name: z.string(),
  phone: z.string(),
  tier: z.string(),
  points: z.number().int(),
  /** Điểm tích trong cửa sổ xét hạng (12 tháng). */
  earned: z.number().int(),
  used: z.number().int(),
  spent: z.string(),
  status: z.string(),
  joined: z.string(),
  expiring: z.number().int(),
  ledger: z.array(loyaltyLedgerRowSchema),
  /** Số dư âm (đảo điểm khi đã tiêu — DC-297 a): chặn đổi điểm tới khi dương. */
  can_redeem: z.boolean().optional(),
  can_adjust: z.boolean().optional(),
});

export const loyaltyMembersPageSchema = z.object({
  data: z.array(loyaltyMemberSchema),
  next_cursor: z.string().nullable(),
  meta: z.object({ total: z.number().int(), page: z.number().int(), limit: z.number().int() }),
});

export const loyaltyLedgerPageSchema = z.object({ data: z.array(loyaltyLedgerRowSchema), next_cursor: z.string().nullable() });

export const loyaltyLookupSchema = z.object({
  member: loyaltyMemberSchema.nullable(),
  contact: z.object({ id: z.string(), name: z.string() }).nullable(),
});

export type LoyaltyConfigDto = z.infer<typeof loyaltyConfigSchema>;
export type LoyaltyLedgerRowDto = z.infer<typeof loyaltyLedgerRowSchema>;
export type LoyaltyMemberDto = z.infer<typeof loyaltyMemberSchema>;
export type LoyaltyMembersPageDto = z.infer<typeof loyaltyMembersPageSchema>;
export type LoyaltyLookupDto = z.infer<typeof loyaltyLookupSchema>;
