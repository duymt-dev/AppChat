// Xuất danh sách thật (TIP-038 pha 3, Blueprint §3.4 — D19 không có module Báo cáo ≠ cấm xuất danh sách, Q-024). Risk write: tạo việc +
// tệp (artifact) — không undo; quyền = quyền XEM của danh sách, kết quả theo data scope người gọi (không coi xuất là quyền đọc toàn
// workspace). Bộ lọc cùng tham số GET danh sách (allowlist — không SQL / biểu thức cột). Không cấp cho agent (tệp tải về là kênh rò dữ liệu
// hàng loạt); Trợ lý gọi được với thẻ xác nhận.
import {
  contractExportFilter,
  listExportResultSchema,
  orderExportFilter,
  quoteExportFilter,
  ticketExportFilter,
} from '@appchat/shared';
import { defineAction } from './define';

const base = { risk: 'write' as const, agentGrantable: false, invalidates: ['data-jobs'] };
const note =
  'Exports ALL rows matching the filter (not only the current page) as an XLSX file the caller downloads; ≤ 50 rows ready immediately, more → background job. Max 100,000 rows.';

export const quoteExport = defineAction({
  id: 'quote.export',
  module: 'sales',
  title: 'actions.quote.export.title',
  description: `Export the quotes visible to the caller (same filters as the quote list: status, owner_id, contact_id, returning, q, custom). ${note} Example: {"status":"sent"}`,
  input: quoteExportFilter,
  output: listExportResultSchema,
  permission: 'quote.view',
  ...base,
});

export const orderExport = defineAction({
  id: 'order.export',
  module: 'sales',
  title: 'actions.order.export.title',
  description: `Export the orders visible to the caller (same filters as the order list: chip, owner_id, contact_id, value, source, q, custom). ${note} Example: {"chip":"paid"}`,
  input: orderExportFilter,
  output: listExportResultSchema,
  permission: 'order.view',
  ...base,
});

export const contractExport = defineAction({
  id: 'contract.export',
  module: 'sales',
  title: 'actions.contract.export.title',
  description: `Export the contracts visible to the caller (same filters as the contract list: status chip, owner_id, contact_id, value, q). ${note} Example: {"status":"signed"}`,
  input: contractExportFilter,
  output: listExportResultSchema,
  permission: 'contract.view',
  ...base,
});

export const ticketExport = defineAction({
  id: 'ticket.export',
  module: 'support',
  title: 'actions.ticket.export.title',
  description: `Export the tickets visible to the caller (same filters as the ticket list: status, priority, team, category, assignee, sla, q, sort, custom). ${note} Example: {"sla":"breach"}`,
  input: ticketExportFilter,
  output: listExportResultSchema,
  permission: 'ticket.view',
  ...base,
});
