// Catalog — thao tác bổ sung (TIP-032b, Blueprint §3.4): sửa / xoá danh mục, biến thể là thực thể riêng (tạo / sửa / lưu trữ), nhập sản
// phẩm CSV / XLSX từ tệp đã tải lên (≤ 500 dòng chạy ngay; > 500 dòng → 202 `job_accepted` + theo dõi ở /v1/product-imports/:id) và
// huỷ / chạy lại lần nhập. Tiền là string VND không âm; tồn biến thể chỉ đổi qua đơn / stock action (không có ô stock ở đây).
import { z } from 'zod';
import { defineAction } from './define';

const id = z.string().min(1);
const money = z.string().regex(/^\d+$/);

export const categoryList = defineAction({
  id: 'category.list',
  module: 'catalog',
  title: 'actions.category.list.title',
  description: 'List product categories with their id, colour and number of products (to rename / delete a category by name). Example: {}',
  input: z.object({}),
  output: z.object({ items: z.array(z.object({ category_id: z.string(), name: z.string(), color: z.string(), product_count: z.number().int() })) }),
  permission: 'catalog.view',
  risk: 'read',
  agentGrantable: true,
  invalidates: [],
});

export const categoryUpdate = defineAction({
  id: 'category.update',
  module: 'catalog',
  title: 'actions.category.update.title',
  description: 'Rename a product category or change its colour. Example: {"category_id":"…","name":"Liệu trình","color":"#2DC56A"}',
  input: z.object({ category_id: id, name: z.string().trim().min(1).max(60).optional(), color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional() }),
  output: z.object({ category_id: z.string(), name: z.string(), color: z.string() }),
  permission: 'catalog.manage',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['catalog'],
});

export const categoryDelete = defineAction({
  id: 'category.delete',
  module: 'catalog',
  title: 'actions.category.delete.title',
  description: 'Delete an empty product category. A category that still has products (active, draft or archived) is refused with 409. Example: {"category_id":"…"}',
  input: z.object({ category_id: id }),
  output: z.object({ category_id: z.string() }),
  permission: 'catalog.manage',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['catalog'],
});

const variantFields = z.object({
  name: z.string().trim().min(1).max(120),
  sku: z.string().trim().min(1).max(60),
  /** Giá riêng của biến thể (VND chưa VAT); bỏ trống = giá sản phẩm. */
  price: money.nullable().optional(),
  attrs: z.record(z.string().max(40), z.string().max(60)).optional(),
});

export const productVariantCreate = defineAction({
  id: 'product_variant.create',
  module: 'catalog',
  title: 'actions.product_variant.create.title',
  description: 'Add a variant to a product (SKU unique across active variants). Example: {"product_id":"…","name":"Size L","sku":"AO-L","price":"250000"}',
  input: variantFields.extend({ product_id: id }),
  output: z.object({ variant_id: z.string(), sku: z.string() }),
  permission: 'catalog.manage',
  risk: 'write',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['catalog'],
});

export const productVariantUpdate = defineAction({
  id: 'product_variant.update',
  module: 'catalog',
  title: 'actions.product_variant.update.title',
  description: 'Update a variant (name / SKU / price / attributes). Stock changes go through stock actions. Example: {"variant_id":"…","patch":{"price":"260000"},"if_version":1}',
  input: z.object({ variant_id: id, patch: variantFields.partial(), if_version: z.number().int().optional() }),
  output: z.object({ variant_id: z.string(), version: z.number().int() }),
  permission: 'catalog.manage',
  risk: 'write',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['catalog'],
});

export const productVariantArchive = defineAction({
  id: 'product_variant.archive',
  module: 'catalog',
  title: 'actions.product_variant.archive.title',
  description: 'Archive a variant: past quote / order lines keep it, new lines can no longer pick it. Example: {"variant_id":"…"}',
  input: z.object({ variant_id: id }),
  output: z.object({ variant_id: z.string() }),
  permission: 'catalog.manage',
  risk: 'write',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['catalog'],
});

/** Ánh xạ cột tệp → trường sản phẩm (tên cột đúng như hàng tiêu đề). `name` + `price` bắt buộc. */
const importMapping = z.object({
  name: z.string().min(1).max(80),
  price: z.string().min(1).max(80),
  sku: z.string().max(80).optional(),
  type: z.string().max(80).optional(),
  category: z.string().max(80).optional(),
  unit: z.string().max(80).optional(),
  tax_rate: z.string().max(80).optional(),
  description: z.string().max(80).optional(),
  /** TIP-027b: cột JSON mô tả có định dạng (schema đóng) — khứ hồi định dạng; vắng = chỉ chữ thuần. */
  description_doc: z.string().max(80).optional(),
  sessions: z.string().max(80).optional(),
  valid_days: z.string().max(80).optional(),
});

export const productImport = defineAction({
  id: 'product.import',
  module: 'catalog',
  title: 'actions.product.import.title',
  description:
    'Import products from an uploaded CSV / XLSX file (file_id from POST /v1/files, purpose "import"). Columns are mapped by header name; rows with the SKU of an existing product update it, others create new products; invalid rows are reported per row. ≤ 500 rows run immediately; more rows are accepted as a background job (202 job_accepted — poll status_url, do not call again). Example: {"file_id":"…","mapping":{"name":"Tên","price":"Giá","sku":"Mã"}}',
  input: z.object({ file_id: id, mapping: importMapping }),
  output: z.object({ import_id: z.string(), status: z.string(), total: z.number().int(), created: z.number().int(), updated: z.number().int(), failed: z.number().int() }),
  permission: 'catalog.manage',
  risk: 'write',
  bulk: true,
  agentGrantable: false,
  invalidates: ['catalog'],
});

export const productImportCancel = defineAction({
  id: 'product.import_cancel',
  module: 'catalog',
  title: 'actions.product.import_cancel.title',
  description: 'Cancel a running product import: rows already written stay, remaining rows are skipped. Example: {"import_id":"…"}',
  input: z.object({ import_id: id }),
  output: z.object({ import_id: z.string(), status: z.string() }),
  permission: 'catalog.manage',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['catalog'],
});

export const productImportRetry = defineAction({
  id: 'product.import_retry',
  module: 'catalog',
  title: 'actions.product.import_retry.title',
  description: 'Retry a failed or cancelled product import: only rows without a receipt run again (rows already written are never imported twice). Example: {"import_id":"…"}',
  input: z.object({ import_id: id }),
  output: z.object({ import_id: z.string(), status: z.string() }),
  permission: 'catalog.manage',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['catalog'],
});
