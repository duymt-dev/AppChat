// Mock xuất danh sách (TIP-038 pha 3 + 038b P3 sản phẩm / đề nghị thanh toán; server: packages/core/src/insights/exports/*). Tập dòng lấy từ CHÍNH route GET danh sách không phân
// trang (cùng bộ lọc màn — không lặp điều kiện lọc); ≤ 50 dòng xong ngay kèm link tải, > 50 → 202 job_accepted, `/data-jobs/:id` báo tiến
// độ rồi xong. Tệp mock là CSV có cùng cột mã / trạng thái (mock không dựng XLSX); ô bắt đầu = + - @ được chặn công thức như bản CSV cũ.
import { ApiRequestError, LIST_EXPORT_MAX, LIST_EXPORT_SYNC_MAX } from '@appchat/shared';
import type { MockDb } from '../store';
import type { MockRoute } from '../routes';
import { quotesRoutes } from './quotes';
import { ordersRoutes } from './orders';
import { contractsRoutes } from './contracts';
import { ticketsRoutes } from './tickets';
import { productsRoutes } from './products';
import { invoicesRoutes } from './invoices';
import { exportJob } from './data-jobs';

type Row = { id: string; code: string; status: string } & Record<string, unknown>;
const LIST: Record<string, [MockRoute, string, (r: Row) => unknown[]]> = {
  'quote.export': [quotesRoutes['/quotes']!, 'bao-gia', (r) => [r.code, r.contact_name, r.status, r.total]],
  'order.export': [
    ordersRoutes['/orders']!,
    'don-hang',
    (r) => [r.code, r.contact_name, r.status, r.pay_status, r.total],
  ],
  'contract.export': [
    contractsRoutes['/contracts']!,
    'hop-dong',
    (r) => [r.code, r.title, r.contact_name, r.status, r.value],
  ],
  'ticket.export': [ticketsRoutes['/tickets']!, 'ticket', (r) => [r.code, r.title, r.status, r.priority]],
  // TIP-038b P3: Sản phẩm (giá vốn chỉ khi có quyền — mock bỏ cột) · Đề nghị thanh toán.
  'product.export': [productsRoutes['/products']!, 'san-pham', (r) => [r.code, r.name, r.type, r.status, r.price]],
  'invoice.export': [invoicesRoutes['/invoices']!, 'de-nghi-thanh-toan', (r) => [r.code, r.contact_name, r.status, r.amount]],
};

const cell = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

type Handler = {
  execute(db: MockDb, input: never): unknown;
  preview?(db: MockDb, input: never): { summary: string; count?: number };
};

const rowsOf = (db: MockDb, kind: string, input: Record<string, unknown>) => {
  const { custom, ...f } = input as Record<string, unknown> & { custom?: Record<string, string> };
  const params = {
    ...f,
    ...Object.fromEntries(Object.entries(custom ?? {}).map(([k, v]) => [`cf.${k}`, v])),
  };
  return ((LIST[kind]![0](db, params) as { data: Row[] }).data ?? []) as Row[];
};

export const listExportsHandlers: Record<string, Handler> = Object.fromEntries(
  Object.keys(LIST).map((kind) => [
    kind,
    {
      preview: (db: MockDb, i: Record<string, unknown>) => {
        const n = rowsOf(db, kind, i).length;
        return { summary: `${kind} · ${n}`, count: n };
      },
      execute: (db: MockDb, i: Record<string, unknown>) => {
        const rows = rowsOf(db, kind, i);
        if (rows.length > LIST_EXPORT_MAX)
          throw new ApiRequestError(422, {
            code: 'VALIDATION_FAILED',
            message: 'rows',
            fields: { rows: 'too_many' },
          });
        const CRLF = String.fromCharCode(13, 10);
        const body =
          String.fromCharCode(0xfeff) + rows.map((r) => LIST[kind]![2](r).map(cell).join(',')).join(CRLF);
        const name = `${LIST[kind]![1]}-${new Date().toISOString().slice(0, 10)}.xlsx`;
        const sync = rows.length <= LIST_EXPORT_SYNC_MAX;
        const job = exportJob(
          kind,
          rows.map((r) => r.id),
          name,
          body,
          sync,
        );
        const result = {
          job_id: job.id,
          rows: rows.length,
          file_name: name,
          download_url: job.download_url,
          expires_at: null,
        };
        return sync
          ? result
          : { ...result, __accepted: { job_id: job.id, status_url: `/v1/data-jobs/${job.id}` } };
      },
    },
  ]),
);
