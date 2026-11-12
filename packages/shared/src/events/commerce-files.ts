// Tệp đính kèm đơn / đề nghị (TIP-032d §1.4): sự kiện chỉ id + revision bộ tệp — không tên tệp / nội dung / URL. Client làm mới tab Tệp.
import { z } from 'zod';

const base = { ws: z.string().uuid(), occurred_at: z.string(), attachment_id: z.string().uuid(), revision: z.number().int() };
const orderFile = z.object({ ...base, order_id: z.string().uuid() });
const invoiceFile = z.object({ ...base, invoice_id: z.string().uuid() });

export const COMMERCE_FILE_EVENT_SCHEMAS = {
  'order.file_attached': orderFile,
  'order.file_detached': orderFile,
  'invoice.file_attached': invoiceFile,
  'invoice.file_detached': invoiceFile,
} as const;
