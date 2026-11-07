// Xuất danh sách thật (TIP-038 pha 3, AC07–08): quote.export · order.export · contract.export · ticket.export. Bộ lọc cùng tên tham số với
// GET danh sách (không SQL / biểu thức cột); tập id CHỐT lúc nhận việc; tệp XLSX ô chữ (không công thức), tiền VND giữ đủ chữ số (chuỗi).
// Mọi lần xuất là một việc `data_job` (TIP-045b annex D) — ≤ 50 dòng dựng tệp ngay trong action (200 + handle), > 50 dòng chạy nền (202
// job_accepted). Tải qua `/v1/data-jobs/:id/download` có xác thực, chỉ người tạo, hết hạn 24 giờ — không URL storage thô.
import { z } from 'zod';

export const LIST_EXPORT_KINDS = [
  'quote.export',
  'order.export',
  'contract.export',
  'ticket.export',
  'product.export',
  'invoice.export',
] as const;
export type ListExportKind = (typeof LIST_EXPORT_KINDS)[number];

/** ≤ ngưỡng: dựng tệp ngay trong action; > ngưỡng: việc nền (concurrency §7 — cùng ngưỡng sửa hàng loạt). */
export const LIST_EXPORT_SYNC_MAX = 50;
/** Trần kỹ thuật: quá trần → 422 `rows: too_many` (yêu cầu thu hẹp bộ lọc), không cắt ngầm. */
export const LIST_EXPORT_MAX = 100_000;
export const LIST_EXPORT_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const text = (n: number) => z.string().trim().max(n).optional();
const custom = z.record(z.string().regex(/^[a-z][a-z0-9_]{0,39}$/), z.string().max(100)).optional();

export const quoteExportFilter = z.object({
  status: text(30),
  owner_id: text(64),
  contact_id: text(64),
  returning: z.enum(['all', 'old', 'new']).optional(),
  q: text(100),
  custom,
});
export const orderExportFilter = z.object({
  chip: text(20),
  owner_id: text(64),
  contact_id: text(64),
  value: text(10),
  source: text(20),
  q: text(100),
  custom,
});
export const contractExportFilter = z.object({
  status: text(20),
  owner_id: text(64),
  contact_id: text(64),
  value: text(10),
  q: text(100),
});
export const ticketExportFilter = z.object({
  status: text(20),
  priority: text(20),
  team: text(64),
  category: text(60),
  assignee: text(64),
  sla: z.enum(['all', 'breach', 'risk', 'ok']).optional(),
  q: text(100),
  sort: z.enum(['recent', 'priority']).optional(),
  custom,
});

export const productExportFilter = z.object({
  category: text(60),
  type: text(20),
  status: text(20),
  q: text(100),
  custom,
});
export const invoiceExportFilter = z.object({
  status: text(20),
  contact_id: text(64),
  order_id: text(64),
  owner_id: text(64),
  q: text(100),
});

/** Kết quả action xuất: handle việc + số dòng chốt; `download_url` có ngay khi tệp đã dựng (≤ 50 dòng). */
export const listExportResultSchema = z.object({
  job_id: z.string(),
  rows: z.number().int(),
  file_name: z.string(),
  download_url: z.string().nullable(),
  expires_at: z.string().nullable(),
});
export type ListExportResult = z.infer<typeof listExportResultSchema>;
