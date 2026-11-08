// Liệu trình của khách cho Trợ lý / agent (TIP-033b §1.3, §4.5): `package.list_for_contact` — quyền crm.view (KHÔNG phải package.manage),
// agentGrantable nhưng không tự cấp; khách ngoài scope → 404; gói lọc theo scope bán hàng của đơn sinh ra gói. `remaining` không phải
// "còn đặt được" — đặt lịch vẫn kiểm lại ở appointment.create / confirm.
import { z } from 'zod';
import { PACKAGE_STATUSES } from '@appchat/shared';
import { defineAction } from './define';

export const packageListForContact = defineAction({
  id: 'package.list_for_contact',
  module: 'sales',
  title: 'actions.package.list_for_contact.title',
  description:
    'List a customer’s treatment packages (sessions total / used / remaining, status, expiry) to advise on entitlement before proposing a slot with appointment.find_slots. remaining is not a booking guarantee. Optional service_id keeps packages applicable to that service. Example: {"contact_id":"<id>","status":"active"}',
  input: z.object({
    contact_id: z.string().min(1),
    status: z.enum(PACKAGE_STATUSES).optional(),
    service_id: z.string().optional(),
    cursor: z.string().max(400).optional(),
    limit: z.number().int().min(1).max(100).optional(),
  }),
  output: z.object({
    packages: z.array(
      z.object({
        id: z.string(),
        contact_id: z.string(),
        product_id: z.string(),
        name: z.string(),
        total: z.number().int(),
        used: z.number().int(),
        remaining: z.number().int(),
        status: z.enum(PACKAGE_STATUSES),
        expires_at: z.string().nullable(),
        order_id: z.string().nullable(),
      }),
    ),
    next_cursor: z.string().nullable(),
  }),
  permission: 'crm.view',
  risk: 'read',
  agentGrantable: true,
  invalidates: [],
});
