// Đơn hàng (Blueprint §3.4 sales; COMMERCE-DECISIONS §4, §4b — D31). Prototype L5489–5622.
// Hai trục độc lập: status (new → processing → completed | cancelled) và pay_status (tổng hợp từ khoản thu).
// Đơn từ sàn (source = marketplace): không sửa dòng hàng / giá / tổng — sàn là nguồn sự thật.
import { z } from 'zod';
import { customValuesSchema } from '@appchat/shared';
import { defineAction } from './define';
import { discount, lineItem, money, sourceLink } from './sales-schemas';
import { assignedUserId, ifVersion, ownerEcho } from './commerce-edit-schemas';

const orderId = z.string().min(1);
const shipping = z.object({
  carrier: z.string().max(100).optional(),
  tracking: z.string().max(100).optional(),
  eta: z.string().max(20).optional(),
  address: z.string().max(300).optional(),
  receiver: z.string().max(100).optional(),
  receiver_phone: z.string().max(30).optional(),
});
const fields = z.object({
  contact_id: z.string().min(1),
  owner_user_id: z.string().optional(),
  contract_id: z.string().optional(),
  items: z.array(lineItem).min(1),
  header_discount: discount.nullable().optional(),
  deposit_amount: money.optional(),
  shipping: shipping.optional(),
  note: z.string().max(2000).optional(),
  /** Trường tuỳ biến (D56) — validate theo định nghĩa ở Executor. */
  custom: customValuesSchema.optional(),
  /** Thuộc cơ hội (TIP-026c): đơn tạo xong đưa cơ hội lên Đã mua; cơ hội Thua → 422 `opportunity_lost`. */
  opportunity_id: z.string().min(1).nullable().optional(),
});
const out = z.object({ order_id: z.string(), code: z.string() });
const st = z.object({ order_id: z.string(), status: z.string() });
const opened = (o: { order_id: string }) => ({
  type: 'open' as const,
  entity: 'order',
  id: o.order_id,
  view: 'drawer' as const,
});

export const orderCreate = defineAction({
  id: 'order.create',
  module: 'sales',
  title: 'actions.order.create.title',
  description:
    'Create an order (status new). deposit_amount > 0 turns on deposit (pay_status awaiting_deposit). Example: {"contact_id":"ct_lan","items":[{"name":"HIFU nâng cơ","qty":8,"unit_price":"1500000","tax_rate":8}],"deposit_amount":"3000000"}',
  input: fields.merge(sourceLink),
  output: out,
  permission: 'order.manage',
  risk: 'write',
  agentGrantable: true,
  undo: { windowSec: 86_400 },
  invalidates: ['orders'],
  uiTarget: opened,
});

export const orderCreateFromQuote = defineAction({
  id: 'order.create_from_quote',
  module: 'sales',
  title: 'actions.order.create_from_quote.title',
  description:
    'Create an order from an accepted quote ("→ Đơn hàng"); one order per quote. Example: {"quote_id":"q_2041"}',
  input: z.object({ quote_id: z.string().min(1) }),
  output: out,
  permission: 'order.manage',
  risk: 'write',
  agentGrantable: true,
  undo: { windowSec: 86_400 },
  invalidates: ['orders', 'quotes'],
  uiTarget: opened,
});

export const orderCreateFromContract = defineAction({
  id: 'order.create_from_contract',
  module: 'sales',
  title: 'actions.order.create_from_contract.title',
  description:
    'Create an order from a signed contract ("→ Đơn hàng"); a contract may have many orders. Example: {"contract_id":"ctr_1180"}',
  input: z.object({ contract_id: z.string().min(1) }),
  output: out,
  permission: 'order.manage',
  risk: 'write',
  agentGrantable: true,
  undo: { windowSec: 86_400 },
  invalidates: ['orders', 'contracts'],
  uiTarget: opened,
});

export const orderUpdate = defineAction({
  id: 'order.update',
  module: 'sales',
  title: 'actions.order.update.title',
  description:
    'Edit an order: free while new; while processing only if nothing was paid. Marketplace orders: only responsible person / note / custom fields. owner_user_id is the creator (sales attribution) and can never change; set the responsible person with assigned_user_id (member id or null). Send if_version = version you read. Example: {"order_id":"ord_290409","if_version":2,"patch":{"note":"Giao chiều"}}',
  input: z.object({ order_id: orderId, if_version: ifVersion, patch: fields.partial().extend({ owner_user_id: ownerEcho, assigned_user_id: assignedUserId }) }),
  output: z.object({ order_id: z.string(), version: z.number().int().optional() }),
  permission: 'order.manage',
  risk: 'write',
  agentGrantable: true,
  undo: { windowSec: 86_400 },
  invalidates: ['orders'],
});

export const orderSetDeposit = defineAction({
  id: 'order.set_deposit',
  module: 'sales',
  title: 'actions.order.set_deposit.title',
  description:
    'Turn deposit on (amount > 0) or off ("0"). Example: {"order_id":"ord_290409","deposit_amount":"2850000"}',
  input: z.object({ order_id: orderId, deposit_amount: money, if_version: ifVersion }),
  output: z.object({ order_id: z.string(), pay_status: z.string(), version: z.number().int().optional() }),
  permission: 'order.manage',
  risk: 'write',
  agentGrantable: true,
  undo: { windowSec: 86_400 },
  invalidates: ['orders'],
});

export const orderConfirm = defineAction({
  id: 'order.confirm',
  module: 'sales',
  title: 'actions.order.confirm.title',
  description:
    'Confirm an order (new → processing): stock is deducted, packages are issued. Example: {"order_id":"ord_290409"}',
  input: z.object({ order_id: orderId }),
  output: st,
  permission: 'order.manage',
  risk: 'write',
  agentGrantable: true,
  undo: { windowSec: 86_400 },
  invalidates: ['orders'],
});

export const orderComplete = defineAction({
  id: 'order.complete',
  module: 'sales',
  title: 'actions.order.complete.title',
  description:
    'Complete an order (processing → completed); loyalty points = total / 10.000đ, once (marketplace orders earn none by default). Example: {"order_id":"ord_290411"}',
  input: z.object({ order_id: orderId }),
  output: z.object({ order_id: z.string(), status: z.string(), points: z.number() }),
  permission: 'order.manage',
  risk: 'money',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['orders', 'crm'],
});

export const orderCancel = defineAction({
  id: 'order.cancel',
  module: 'sales',
  title: 'actions.order.cancel.title',
  description:
    'Cancel an order (new / processing → cancelled); reason required. If money was collected a refund request is created and needs Owner approval.',
  input: z.object({ order_id: orderId, reason: z.string().trim().min(1).max(500) }),
  output: z.object({ order_id: z.string(), status: z.string(), refund_requested: z.boolean() }),
  permission: 'order.cancel',
  risk: 'money',
  agentGrantable: false,
  invalidates: ['orders'],
});

export const orderUpdateShipping = defineAction({
  id: 'order.update_shipping',
  module: 'sales',
  title: 'actions.order.update_shipping.title',
  description:
    'Set shipping info (manual entry only). Example: {"order_id":"ord_290411","shipping":{"carrier":"GHN","tracking":"GHN123"}}',
  input: z.object({ order_id: orderId, shipping, if_version: ifVersion }),
  output: z.object({ order_id: z.string(), version: z.number().int().optional() }),
  permission: 'order.manage',
  risk: 'write',
  agentGrantable: true,
  undo: { windowSec: 86_400 },
  invalidates: ['orders'],
});

export const orderSyncNow = defineAction({
  id: 'order.sync_now',
  module: 'sales',
  title: 'actions.order.sync_now.title',
  description: 'Pull new orders (and external stock snapshots when stock_master=external) from connected marketplaces / POS now (OrderSyncProvider, D31). Reports imported, blocked (buyer customer deleted — kept as a private receipt, retried after restore) and failed (invalid payload / write error) separately.',
  input: z.object({}),
  output: z.object({
    imported: z.number(),
    blocked: z.number().default(0),
    failed: z.number().default(0),
    stock_adjusted: z.number().optional(),
    unmatched_skus: z.array(z.string()).optional(),
  }),
  permission: 'integrations.manage',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['orders', 'products'],
});
