// Action riêng của sales (TIP-003c §2): báo giá (xem qua locator công khai / hết hạn / nhắc T-2), đề nghị thanh toán (quá hạn / nhắc
// mốc), liệu trình (cấp khi đơn xác nhận / hết hạn). Chỉ chạy qua capability gắn nguồn (kernel/actions/system); luật nghiệp vụ giữ ở
// domain (QUOTE_FLOW, COMMERCE T-2, INVOICE_REMINDERS, grantPackages 032b). Nhập đơn sàn: bản đã kiểm qua importExternal sẵn có.
import { defineAction } from '../define';
import { systemInput, systemOutput } from './common';

const common = { output: systemOutput, permission: 'self' as const, agentGrantable: false, exposure: 'internal' as const, invalidates: ['sales'] };

export const quoteSystemTransition = defineAction({
  ...common,
  id: 'quote.system_transition',
  module: 'sales',
  title: 'actions.quote.system_transition.title',
  description: 'Internal: record the first public view of a sent quote, expire it after valid_until, or remind the owner T-2 once per validity generation.',
  input: systemInput(['record_view', 'expire', 'remind']),
  risk: 'send',
});

export const invoiceSystemTransition = defineAction({
  ...common,
  id: 'invoice.system_transition',
  module: 'sales',
  title: 'actions.invoice.system_transition.title',
  description: 'Internal: mark an unpaid payment request overdue, or send the current due-date reminder milestone once.',
  input: systemInput(['overdue', 'remind']),
  risk: 'send',
});

export const packageSystemTransition = defineAction({
  ...common,
  id: 'package.system_transition',
  module: 'sales',
  title: 'actions.package.system_transition.title',
  description: 'Internal: grant customer packages for a confirmed paid order, expire a package past its expiry, or remind the owner when one session is left after a completed appointment.',
  input: systemInput(['grant_on_confirm', 'expire', 'remind_remaining']),
  risk: 'money',
});

export const orderSystemImport = defineAction({
  ...common,
  id: 'order.system_import',
  module: 'sales',
  title: 'actions.order.system_import.title',
  description: 'Internal: apply one verified marketplace order revision (staged from an authenticated connector event or poll) through the existing importer.',
  input: systemInput(['apply_verified_revision']),
  risk: 'money',
  invalidates: ['orders', 'sales'],
});

export const orderSystemStockSync = defineAction({
  ...common,
  id: 'order.system_stock_sync',
  module: 'sales',
  title: 'actions.order.system_stock_sync.title',
  description: 'Internal: reconcile one verified external stock snapshot item (kind=sync_adjust) idempotently per (connection_id, snapshot_id, sku).',
  input: systemInput(['apply_stock_snapshot']),
  risk: 'write',
  invalidates: ['products', 'orders'],
});
