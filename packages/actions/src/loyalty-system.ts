// Ghi sổ điểm theo sự kiện / lịch (TIP-036, COMMERCE §7, DC-297). System-only: consumer `order.completed` / `order.cancelled` /
// `payment.refunded` và job hết hạn + xét hạng gọi qua ActionExecutor nguồn `system` (actor `system:loyalty`) — không agentGrantable,
// ẩn khỏi Trợ lý / UI (SYSTEM_ONLY); HTTP không gửi được nguồn system, handler kiểm thêm actor.
import { z } from 'zod';
import { defineAction } from './define';

const uuid = z.string().uuid();
const done = z.object({ contact_id: z.string().nullable(), status: z.enum(['posted', 'duplicate', 'skipped']), delta: z.number(), balance_after: z.number().nullable() });

export const loyaltyEarn = defineAction({
  id: 'loyalty.earn',
  module: 'loyalty',
  title: 'actions.loyalty.earn.title',
  description: 'System-only: credit the points of one order completion (basis snapshot taken at completion), once per completion. Not callable by users, assistant or agents.',
  input: z.object({ order_id: uuid, completion_id: uuid, basis: z.record(z.string(), z.unknown()) }),
  output: done,
  permission: 'self',
  risk: 'money',
  agentGrantable: false,
  invalidates: ['loyalty', 'crm'],
});

export const loyaltyReverse = defineAction({
  id: 'loyalty.reverse',
  module: 'loyalty',
  title: 'actions.loyalty.reverse.title',
  description: 'System-only: reverse order points after cancel (and return used points) or an approved refund (proportional, cumulative). Not callable by users, assistant or agents.',
  input: z.object({ order_id: uuid, cause: z.enum(['cancel', 'refund']), payment_id: uuid.optional() }),
  output: done,
  permission: 'self',
  risk: 'money',
  agentGrantable: false,
  invalidates: ['loyalty', 'crm'],
});

export const loyaltyExpire = defineAction({
  id: 'loyalty.expire',
  module: 'loyalty',
  title: 'actions.loyalty.expire.title',
  description: 'System-only: expire a member point lots older than 12 months (FIFO, once per lot). Not callable by users, assistant or agents.',
  input: z.object({ contact_id: uuid }),
  output: done,
  permission: 'self',
  risk: 'money',
  agentGrantable: false,
  invalidates: ['loyalty', 'crm'],
});

export const loyaltyReviewTier = defineAction({
  id: 'loyalty.review_tier',
  module: 'loyalty',
  title: 'actions.loyalty.review_tier.title',
  description: 'System-only: quarterly tier review from points earned in the 12 months before the quarter start. Not callable by users, assistant or agents.',
  input: z.object({ contact_id: uuid, quarter: z.string().regex(/^\d{4}-\d{2}-01$/), window_from: z.string().datetime(), window_to: z.string().datetime() }),
  output: z.object({ contact_id: z.string(), from: z.string(), to: z.string(), changed: z.boolean() }),
  permission: 'self',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['loyalty', 'crm'],
});
