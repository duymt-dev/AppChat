// Xuất danh sách thật (TIP-038 pha 3, Blueprint §3.4 — D19 không có module Báo cáo ≠ cấm xuất danh sách, Q-024). Risk write: tạo việc +
// tệp (artifact) — không undo; quyền = quyền XEM của danh sách, kết quả theo data scope người gọi (không coi xuất là quyền đọc toàn
// workspace). Bộ lọc cùng tham số GET danh sách (allowlist — không SQL / biểu thức cột). Không cấp cho agent (tệp tải về là kênh rò dữ liệu
// hàng loạt); Trợ lý gọi được với thẻ xác nhận.
import {
  contactNoteExportFilter,
  contactOpportunityExportFilter,
  contactTaskExportFilter,
  contractExportFilter,
  listExportResultSchema,
  invoiceExportFilter,
  orderExportFilter,
  productExportFilter,
  quoteExportFilter,
  ticketExportFilter,
} from '@appchat/shared';
import { defineAction } from './define';

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
  risk: 'write',
  agentGrantable: false,
  invalidates: ['data-jobs'],
});

export const orderExport = defineAction({
  id: 'order.export',
  module: 'sales',
  title: 'actions.order.export.title',
  description: `Export the orders visible to the caller (same filters as the order list: chip, owner_id, contact_id, value, source, q, custom). ${note} Example: {"chip":"paid"}`,
  input: orderExportFilter,
  output: listExportResultSchema,
  permission: 'order.view',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['data-jobs'],
});

export const contractExport = defineAction({
  id: 'contract.export',
  module: 'sales',
  title: 'actions.contract.export.title',
  description: `Export the contracts visible to the caller (same filters as the contract list: status chip, owner_id, contact_id, value, q). ${note} Example: {"status":"signed"}`,
  input: contractExportFilter,
  output: listExportResultSchema,
  permission: 'contract.view',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['data-jobs'],
});

export const ticketExport = defineAction({
  id: 'ticket.export',
  module: 'support',
  title: 'actions.ticket.export.title',
  description: `Export the tickets visible to the caller (same filters as the ticket list: status, priority, team, category, assignee, sla, q, sort, custom). ${note} Example: {"sla":"breach"}`,
  input: ticketExportFilter,
  output: listExportResultSchema,
  permission: 'ticket.view',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['data-jobs'],
});

// TIP-038b P3 (DC-374): sản phẩm + đề nghị thanh toán dùng CÙNG khung xuất 038 (không exporter thứ hai).
export const productExport = defineAction({
  id: 'product.export',
  module: 'catalog',
  title: 'actions.product.export.title',
  description: `Export the products / services (same filters as the product list: category, type, status, q, custom). Cost price is included only for users allowed to see it; stock is a read-only snapshot. ${note} Example: {"type":"service"}`,
  input: productExportFilter,
  output: listExportResultSchema,
  permission: 'catalog.view',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['data-jobs'],
});

export const invoiceExport = defineAction({
  id: 'invoice.export',
  module: 'sales',
  title: 'actions.invoice.export.title',
  description: `Export the payment requests (Đề nghị thanh toán — not VAT invoices) visible to the caller (same filters as the list: status, contact_id, order_id, owner_id, q). ${note} Example: {"status":"overdue"}`,
  input: invoiceExportFilter,
  output: listExportResultSchema,
  permission: 'invoice.manage',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['data-jobs'],
});

// TIP-026b §5: 3 tập hoạt động CRM qua CÙNG khung xuất 038 (tệp XLSX ô chữ, ≤ 50 ngay / > 50 nền, tải có hạn theo quyền hiện tại). Quyền =
// crm.export (người xem khách không tự xuất được); dòng theo scope crm HIỆN TẠI. Cột id / thời điểm / trạng thái chỉ đọc (nhập lại → loại).
const activityNote = `${note} Includes read-only id / created / state columns; re-importing such a file skips those rows (no silent update).`;

export const contactNoteExport = defineAction({
  id: 'contact_note.export',
  module: 'crm',
  title: 'actions.contact_note.export.title',
  description: `Export CRM notes / comments of the customers visible to the caller (filters: contact_id, owner_id, stage, q, kind note|comment). ${activityNote} Example: {"kind":"note"}`,
  input: contactNoteExportFilter,
  output: listExportResultSchema,
  permission: 'crm.export',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['data-jobs'],
});

export const contactTaskExport = defineAction({
  id: 'contact_task.export',
  module: 'crm',
  title: 'actions.contact_task.export.title',
  description: `Export CRM follow-up tasks (việc chăm sóc — not AI tasks) of the customers visible to the caller (filters: contact_id, owner_id, stage, q, state open|done|cancelled). ${activityNote} Example: {"state":"open"}`,
  input: contactTaskExportFilter,
  output: listExportResultSchema,
  permission: 'crm.export',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['data-jobs'],
});

export const contactOpportunityExport = defineAction({
  id: 'contact_opportunity.export',
  module: 'crm',
  title: 'actions.contact_opportunity.export.title',
  description: `Export CRM opportunities of the customers visible to the caller (filters: contact_id, owner_id, stage = customer stage, q, opp_stage, archived). The amount column is the expected amount (estimate — NOT revenue) and is present only for users allowed to see quote money. ${activityNote} Example: {"opp_stage":"proposal"}`,
  input: contactOpportunityExportFilter,
  output: listExportResultSchema,
  permission: 'crm.export',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['data-jobs'],
});
