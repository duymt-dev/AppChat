// Tệp đính kèm đề nghị thanh toán (TIP-032d §1.2–1.3): như đơn — gắn / gỡ / liệt kê tệp bổ sung; PDF đề nghị đã gửi và phiếu thu (chứng từ
// đã sinh) chỉ liệt kê để mở / tải, KHÔNG gỡ / thay được qua các action này, không đổi invoice.file_id / receipt_file_id.
import { z } from 'zod';
import { defineAction } from './define';
import { attachReceipt, attachmentList, attachmentSource, detachReceipt, uuid } from './commerce-file-schemas';

export const invoiceFileAttach = defineAction({
  id: 'invoice.file_attach',
  module: 'sales',
  title: 'actions.invoice.file_attach.title',
  description:
    'Attach a supplementary file to a payment request (never changes amounts, status or the issued PDF). source.kind=target_upload_handle: a file uploaded FOR this payment request; source.kind=assistant_artifact_ref: copy a file the user gave the Assistant after the user confirms. if_revision from invoice.files_list. Example: {"invoice_id":"0193…","source":{"kind":"target_upload_handle","file_id":"0193…"},"if_revision":0}',
  input: z.object({ invoice_id: uuid, source: attachmentSource, if_revision: z.number().int().min(0) }),
  output: attachReceipt,
  permission: 'invoice.manage',
  risk: 'write',
  agentGrantable: true,
  invalidates: ['invoices'],
});

export const invoiceFileDetach = defineAction({
  id: 'invoice.file_detach',
  module: 'sales',
  title: 'actions.invoice.file_detach.title',
  description:
    'Remove a user attachment from a payment request (file kept for retention / cleanup). The issued payment-request PDF and receipts cannot be removed. Example: {"invoice_id":"0193…","attachment_id":"0193…","if_version":1}',
  input: z.object({ invoice_id: uuid, attachment_id: uuid, if_version: z.number().int().min(1) }),
  output: detachReceipt,
  permission: 'invoice.manage',
  risk: 'delete',
  agentGrantable: true,
  invalidates: ['invoices'],
});

export const invoiceFilesList = defineAction({
  id: 'invoice.files_list',
  module: 'sales',
  title: 'actions.invoice.files_list.title',
  description: 'List files of a payment request: user attachments plus the issued PDF / receipts (open-only). No download links. Example: {"invoice_id":"0193…"}',
  input: z.object({ invoice_id: uuid, limit: z.number().int().min(1).max(50).optional(), cursor: z.string().max(200).optional() }),
  output: attachmentList,
  permission: 'invoice.manage',
  risk: 'read',
  agentGrantable: true,
  invalidates: [],
});
