// Khách thân thiết (Blueprint §3.4 loyalty; §2.2 loyalty_config / loyalty_ledger; COMMERCE §7). Prototype L4412–4740.
// Luật đã chốt: 10.000đ = 1 điểm, cộng một lần khi đơn completed; hạng 0 / 5.000 / 15.000 / 40.000 × 1 / 1 / 1,5 / 2;
// đổi 1 điểm = 100đ, tối đa 50% đơn; hết hạn 12 tháng (FIFO). Điều chỉnh tay bắt buộc 1 trong 7 lý do.
import { z } from 'zod';
import { defineAction } from './define';
import { ADJUST_REASONS } from './loyalty-reasons';

export const loyaltyGetMember = defineAction({
  id: 'loyalty.get_member',
  module: 'loyalty',
  title: 'actions.loyalty.get_member.title',
  description: 'Read a member: points balance, tier, points expiring soon. Example: {"contact_id":"ct_lan"}',
  input: z.object({ contact_id: z.string().min(1) }),
  output: z.object({ contact_id: z.string(), points: z.number(), tier: z.string(), expiring: z.number() }),
  permission: 'loyalty.view',
  risk: 'read',
  agentGrantable: true,
  skill: true,
  invalidates: [],
});

export const loyaltyAdjustPoints = defineAction({
  id: 'loyalty.adjust_points',
  module: 'loyalty',
  title: 'actions.loyalty.adjust_points.title',
  description:
    'Manually add or subtract points for a member; one of 7 reasons is required. Example: {"contact_id":"ct_lan","delta":200,"reason":"compensation","note":"Bù chậm trễ"}',
  input: z.object({
    contact_id: z.string().min(1),
    delta: z.number().int().refine((v) => v !== 0, 'delta'),
    reason: z.enum(ADJUST_REASONS),
    note: z.string().max(500).optional(),
  }),
  output: z.object({ contact_id: z.string(), balance_after: z.number(), tier: z.string() }),
  permission: 'loyalty.adjust',
  risk: 'money',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['loyalty'],
});

export const loyaltyUpdateConfig = defineAction({
  id: 'loyalty.update_config',
  module: 'loyalty',
  title: 'actions.loyalty.update_config.title',
  description:
    'Update loyalty settings that are allowed to change: enabled, tier multipliers, marketplace orders earning. Earn/redeem rates, max 50% redeem and 12-month expiry are fixed by COMMERCE §7.',
  input: z.object({
    enabled: z.boolean().optional(),
    tiers: z.array(z.object({ key: z.enum(['member', 'silver', 'gold', 'diamond']), mult: z.number().min(1).max(5) })).length(4).optional(),
    marketplace_earn: z.boolean().optional(),
  }),
  output: z.object({ ok: z.boolean() }),
  permission: 'loyalty.config',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['loyalty'],
});
