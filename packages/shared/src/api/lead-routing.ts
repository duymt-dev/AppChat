// `GET /v1/settings/lead-routing` (TIP-042b, COMMERCE §8b, DC-238) — rule mặc định + ghi đè từng tài khoản kênh, cùng danh sách ứng viên
// (thành viên active, nhóm, tài khoản kênh) cho form. Quyền `crm.reassign`. Mock transport và API thật parse cùng schema.
import { z } from 'zod';

export const LEAD_ROUTING_MODES = ['manual', 'round_robin', 'least_busy', 'by_channel'] as const;
export type LeadRoutingMode = (typeof LEAD_ROUTING_MODES)[number];
/** Trần pool người nhận theo danh sách (pool lớn hơn dùng nhóm). */
export const LEAD_ROUTING_MAX_USERS = 100;

export const leadRoutingRuleSchema = z.object({
  id: z.string(),
  /** null = rule mặc định. */
  channel_account_id: z.string().nullable(),
  enabled: z.boolean(),
  enabled_at: z.string().nullable(),
  mode: z.enum(LEAD_ROUTING_MODES),
  user_ids: z.array(z.string()),
  team_id: z.string().nullable(),
  fixed_user_id: z.string().nullable(),
  version: z.number().int(),
});
export type LeadRoutingRuleDto = z.infer<typeof leadRoutingRuleSchema>;

export const leadRoutingSchema = z.object({
  rules: z.array(leadRoutingRuleSchema),
  candidates: z.object({
    users: z.array(z.object({ id: z.string(), name: z.string() })),
    teams: z.array(z.object({ id: z.string(), name: z.string() })),
    accounts: z.array(z.object({ id: z.string(), name: z.string(), type: z.string(), legacy_assign_mode: z.string().nullable() })),
  }),
});
export type LeadRoutingDto = z.infer<typeof leadRoutingSchema>;
