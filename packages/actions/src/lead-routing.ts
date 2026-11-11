// Chia lead mới (TIP-042b, COMMERCE §8b, REQ-F01c, DC-238).
// - `lead_routing.update`: người có `crm.reassign` cấu hình rule mặc định / ghi đè tài khoản kênh (risk config, CAS `if_version` khi sửa,
//   tạo lần đầu cần Idempotency-Key). Chỉ áp cho lead MỚI tạo sau lúc bật — không chia lại khách cũ, không đổi chủ đã có. Undo 24h trả cấu hình.
// - `lead_routing.apply`: system-only — consumer `lead.routing_requested` (ROLE=jobs) gọi qua ActionExecutor nguồn system (actor
//   `system:lead-routing`); người / Trợ lý / agent không gọi được (SYSTEM_ONLY + guard actor). Input chỉ event_id — handler tự nạp event.
import { z } from 'zod';
import { LEAD_ROUTING_MAX_USERS, LEAD_ROUTING_MODES } from '@appchat/shared';
import { defineAction } from './define';

const id = z.string().min(1).max(64);

export const leadRoutingUpdate = defineAction({
  id: 'lead_routing.update',
  module: 'crm',
  title: 'actions.lead_routing.update.title',
  description:
    'Configure how NEW leads (contacts created after the rule is enabled) get their first owner: the default rule (no channel_account_id) or an override for one channel account. Pool = user_ids or team_id; by_channel needs fixed_user_id. Never reassigns existing owners. Example: {"enabled":true,"mode":"round_robin","user_ids":["0190f000-0000-7000-8000-0000000000a1","0190f000-0000-7000-8000-0000000000a2"]}',
  input: z.object({
    rule_id: z.string().uuid().optional(),
    channel_account_id: id.nullable().optional(),
    if_version: z.number().int().positive().optional(),
    enabled: z.boolean(),
    mode: z.enum(LEAD_ROUTING_MODES),
    user_ids: z.array(id).max(LEAD_ROUTING_MAX_USERS).optional(),
    team_id: id.nullable().optional(),
    fixed_user_id: id.nullable().optional(),
  }),
  output: z.object({ rule_id: z.string(), version: z.number().int() }),
  permission: 'crm.reassign',
  risk: 'config',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['lead_routing', 'channels'],
});

export const leadRoutingApply = defineAction({
  id: 'lead_routing.apply',
  module: 'crm',
  title: 'actions.lead_routing.apply.title',
  description: 'System-only: assign the first owner of a new lead from the enabled routing rule, for one lead.routing_requested event. Not callable by users, assistant or agents. Example: {"event_id":"0190f000-0000-7000-8000-0000000000e1"}',
  input: z.object({ event_id: z.string().uuid() }),
  output: z.object({ contact_id: z.string().nullable(), selected_user_id: z.string().nullable(), reason: z.string() }),
  permission: 'self',
  risk: 'write',
  agentGrantable: false,
  exposure: 'internal',
  invalidates: ['crm', 'inbox'],
});
