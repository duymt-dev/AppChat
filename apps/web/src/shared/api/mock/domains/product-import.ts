// Mock nhập sản phẩm từ tệp (TIP-032b; server: packages/core/src/catalog/import/*). Upload purpose `import` giữ chữ CSV (mock không đọc
// XLSX) → `product.import` đọc theo tiêu đề cột của mapping: dòng thiếu tên / giá sai → lỗi theo dòng; SKU trùng sản phẩm có sẵn → cập nhật
// giá / tên, chưa có → tạo qua handler `product.create`. ≤ 500 dòng: kết quả ngay; > 500 dòng: `__accepted` (mock-transport trả 202
// job_accepted) — lần đọc `/product-imports/:id` đầu tiên báo `running`, lần sau `completed` (giả việc nền; dòng lỗi không làm cả lần
// nhập `failed` — như processor). Huỷ (lặp lại an toàn) / chạy lại như server.
// Kiểu cấu trúc, không import handlers / store / domain khác — handler gắn ở products.ts (tránh vòng phụ thuộc).
import { ApiRequestError } from '@appchat/shared';

const SYNC_ROWS = 500;
export type ImportInput = { file_id: string; mapping: Mapping };
type Mapping = { name: string; price: string; sku?: string } & Record<string, string | undefined>;
/** Sản phẩm đang bán (structural) + tạo mới qua handler `product.create` của products.ts. */
export type ImportCatalog = {
  list: { id: string; code: string; name: string; price: string; version?: number; deleted?: boolean }[];
  create: (r: { name: string; price: string; sku?: string }) => string;
};
type Imp = {
  id: string;
  status: 'queued' | 'running' | 'cancelling' | 'cancelled' | 'completed' | 'failed';
  file_name: string;
  total: number;
  created: number;
  updated: number;
  failed: number;
  rows: { row_no: number; status: 'created' | 'updated' | 'failed'; product_id: string | null; error: string | null }[];
  polls: number;
  created_at: string;
  finished_at: string | null;
};

/** Chữ tệp CSV đã "tải lên" (mock-transport.upload ghi khi purpose = import). */
export const importTexts = new Map<string, { name: string; text: string }>();
const imports = new Map<string, Imp>();
let seq = 0;

const bad = (fields: Record<string, string>) => new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: Object.keys(fields)[0]!, fields });

function parse(fileId: string, m: Mapping) {
  const f = importTexts.get(fileId);
  if (!f) throw bad({ file_id: 'format' });
  const [head = '', ...lines] = f.text.split(/\r?\n/).filter((l) => l.trim());
  const cols = head.split(',').map((c) => c.trim().toLowerCase());
  const at = (k: string) => {
    const name = m[k];
    if (!name) return -1;
    const i = cols.indexOf(name.trim().toLowerCase());
    if (i < 0) throw bad({ [`mapping.${k}`]: 'column_not_found' });
    return i;
  };
  const [iName, iPrice, iSku] = [at('name'), at('price'), at('sku')];
  return { name: f.name, rows: lines.map((l) => l.split(',').map((c) => c.trim())).map((c) => ({ name: c[iName] ?? '', price: (c[iPrice] ?? '').replace(/[.\sđ]/g, ''), sku: iSku >= 0 ? (c[iSku] ?? '') : '' })) };
}

function write(cat: ImportCatalog, imp: Imp, rows: ReturnType<typeof parse>['rows'], from = 0) {
  rows.forEach((r, k) => {
    const row_no = k + 1;
    if (row_no <= from || imp.rows.some((x) => x.row_no === row_no)) return;
    const error = !r.name ? 'name:required' : !/^\d+$/.test(r.price) ? 'price:invalid' : null;
    if (error) return imp.rows.push({ row_no, status: 'failed', product_id: null, error });
    const hit = r.sku ? cat.list.find((p) => !p.deleted && p.code.toLowerCase() === r.sku.toLowerCase()) : undefined;
    if (hit) {
      Object.assign(hit, { name: r.name, price: r.price, version: (hit.version ?? 1) + 1 });
      return imp.rows.push({ row_no, status: 'updated', product_id: hit.id, error: null });
    }
    imp.rows.push({ row_no, status: 'created', product_id: cat.create({ name: r.name, price: r.price, sku: r.sku || undefined }), error: null });
  });
  for (const k of ['created', 'updated', 'failed'] as const) imp[k] = imp.rows.filter((x) => x.status === k).length;
}

const view = (i: Imp) => ({ id: i.id, status: i.status, file_name: i.file_name, total: i.total, processed: i.rows.length, created: i.created, updated: i.updated, failed: i.failed, error: null, created_at: i.created_at, finished_at: i.finished_at });
const own = (id: string) => {
  const i = imports.get(id);
  if (!i) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: id, fields: { import_id: 'not_found' } });
  return i;
};
const finish = (i: Imp, s: Imp['status']) => Object.assign(i, { status: s, finished_at: new Date().toISOString() });

export function importPreview(i: ImportInput) {
  const p = parse(i.file_id, i.mapping);
  return { summary: `${p.name} · ${p.rows.length}`, count: p.rows.length };
}

export function importRun(cat: ImportCatalog, i: ImportInput) {
  const p = parse(i.file_id, i.mapping);
  const id = `imp_${++seq}`;
  const imp: Imp = { id, status: 'running', file_name: p.name, total: p.rows.length, created: 0, updated: 0, failed: 0, rows: [], polls: 0, created_at: new Date().toISOString(), finished_at: null };
  imports.set(id, imp);
  write(cat, imp, p.rows);
  if (p.rows.length > SYNC_ROWS) return { __accepted: { job_id: id, status_url: `/v1/product-imports/${id}` } };
  finish(imp, 'completed');
  return { import_id: id, status: imp.status, total: imp.total, created: imp.created, updated: imp.updated, failed: imp.failed };
}

export function importCancel(i: { import_id: string }) {
  const imp = own(i.import_id);
  if (imp.status === 'cancelled') return { import_id: imp.id, status: imp.status };
  if (imp.status !== 'running' && imp.status !== 'queued') throw new ApiRequestError(409, { code: 'INVALID_STATE', message: imp.status });
  finish(imp, 'cancelled');
  return { import_id: imp.id, status: imp.status };
}

export function importRetry(i: { import_id: string }) {
  const imp = own(i.import_id);
  if (imp.status !== 'failed' && imp.status !== 'cancelled') throw new ApiRequestError(409, { code: 'INVALID_STATE', message: imp.status });
  Object.assign(imp, { status: 'running', polls: 0, finished_at: null });
  return { __accepted: { job_id: imp.id, status_url: `/v1/product-imports/${imp.id}` } };
}

/** `GET /product-imports/:id` (+ `/rows`, `/errors`). Lần đọc thứ hai của lần đang chạy → xong (đã ghi đủ dòng ở execute). */
export const productImportRoute = (path: string): (() => unknown) | undefined => {
  const m = path.match(/^\/product-imports\/(imp_\d+)(\/rows|\/errors)?$/);
  if (!m) return undefined;
  return () => {
    const imp = own(m[1]!);
    if (m[2]) {
      const data = imp.rows.filter((r) => m[2] === '/rows' || r.status === 'failed');
      return { data, meta: { total: data.length, page: 1, limit: 100 }, next_cursor: null };
    }
    if (imp.status === 'running' && ++imp.polls > 1) finish(imp, 'completed');
    return view(imp);
  };
};
