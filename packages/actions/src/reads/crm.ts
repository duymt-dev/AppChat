// Action đọc khách cho Trợ lý / agent (TIP-023b R2 · DC-224): `contact.get` (hồ sơ rút gọn) và `contact.get_360` (thêm số liệu bán hàng +
// hẹn / ticket gần đây). Cùng `visibleContact` với màn Khách hàng (ngoài scope → NOT_FOUND); không trả CCCD / MST / ghi chú AI / custom ẩn.
import { z } from 'zod';
import { defineAction } from '../define';

const profile = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  zalo: z.string().nullable(),
  city: z.string().nullable(),
  stage: z.string(),
  group: z.string().nullable(),
  owner_user_id: z.string().nullable(),
  points: z.string(),
  total_spent: z.string(),
  last_interaction_at: z.string(),
});

export const contactGet = defineAction({
  id: 'contact.get',
  module: 'crm',
  title: 'actions.contact.get.title',
  description: 'Get one customer profile (contact info, stage, group, points, total spent). Accepts id or code. Example: {"contact_id":"KH-1016"}',
  input: z.object({ contact_id: z.string().min(1) }),
  output: profile,
  permission: 'crm.view',
  risk: 'read',
  agentGrantable: true,
  invalidates: [],
  uiTarget: (o) => ({ type: 'open', entity: 'contact', id: o.id, view: 'drawer' }),
});

export const contactGet360 = defineAction({
  id: 'contact.get_360',
  module: 'crm',
  title: 'actions.contact.get_360.title',
  description: 'Customer 360 summary: profile, remembered facts (allergies, preferences — use them when serving the customer), counts of open quotes / orders / unpaid payment requests (only those the caller may see) and the next appointment. Example: {"contact_id":"KH-1016"}',
  input: z.object({ contact_id: z.string().min(1) }),
  output: profile.extend({
    open_quotes: z.number().int(),
    open_orders: z.number().int(),
    unpaid_invoices: z.number().int(),
    open_tickets: z.number().int(),
    next_appointment: z.object({ id: z.string(), code: z.string(), start_at: z.string(), status: z.string() }).nullable(),
    /** Trí nhớ khách (TIP-015b): ≤ 20 fact mới nhất — lượt Trợ lý sau dùng lại. */
    memory: z.array(z.string()),
  }),
  permission: 'crm.view',
  risk: 'read',
  agentGrantable: true,
  invalidates: [],
  uiTarget: (o) => ({ type: 'open', entity: 'contact', id: o.id, view: 'drawer' }),
});
