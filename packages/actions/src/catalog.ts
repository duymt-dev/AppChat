// Sản phẩm & dịch vụ (Blueprint §3.4 catalog; COMMERCE-DECISIONS §2). Prototype L5624–5753, L4069–4160.
import { z } from 'zod';
import { customValuesSchema, descriptionDocSchema } from '@appchat/shared';
import { defineAction } from './define';

const productId = z.string().min(1);
/** Tiền là string VND (Blueprint §4.1); giá nhập là giá chưa VAT (COMMERCE §2). */
const money = z.string().regex(/^\d+$/);

const productFields = z.object({
  name: z.string().trim().min(1).max(160),
  type: z.enum(['physical', 'service', 'combo', 'package', 'digital', 'rental']),
  category: z.string().max(60).optional(),
  price: money,
  cost: money.optional(),
  unit: z.string().max(20).optional(),
  tax_rate: z.union([z.literal(0), z.literal(5), z.literal(8), z.literal(10)]).optional(),
  status: z.enum(['active', 'draft']).optional(),
  description: z.string().max(4000).optional(),
  /** Mô tả có định dạng (TIP-027b): đoạn / danh sách chấm / số + đậm / nghiêng / gạch chân. Gửi kèm `description` thì phải bằng phép chiếu chữ thuần. null = xoá. */
  description_doc: descriptionDocSchema.nullable().optional(),
  sku: z.string().max(40).optional(),
  stock: z.number().int().optional(),
  duration_min: z.number().int().min(0).optional(),
  sessions: z.number().int().min(1).optional(),
  valid_days: z.number().int().min(1).optional(),
  /** Liệu trình cho dùng khi mới cọc (COMMERCE §6) — chỉ loại package. */
  grant_on_deposit: z.boolean().optional(),
  deposit: money.optional(),
  rental_unit: z.enum(['hour', 'day', 'week', 'month']).optional(),
  /** Ngưỡng cảnh báo sắp hết (physical, COMMERCE §2). */
  low_stock_threshold: z.number().int().min(0).optional(),
  components: z.array(z.object({ name: z.string().min(1), qty: z.number().int().min(1) })).optional(),
  attrs: z.array(z.object({ name: z.string().min(1), values: z.array(z.string().min(1)) })).optional(),
  /** Trường tuỳ biến (D56) — validate theo định nghĩa ở Executor. */
  custom: customValuesSchema.optional(),
});

export const productCreate = defineAction({
  id: 'product.create',
  module: 'catalog',
  title: 'actions.product.create.title',
  description:
    'Create a product / service (price excludes VAT, string VND). Example: {"name":"Khám da soi VISIA","type":"service","price":"500000","tax_rate":8}',
  input: productFields,
  output: z.object({ product_id: z.string(), code: z.string() }),
  permission: 'catalog.manage',
  risk: 'write',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['catalog'],
  uiTarget: (o) => ({ type: 'open', entity: 'product', id: o.product_id, view: 'drawer' }),
});

export const productUpdate = defineAction({
  id: 'product.update',
  module: 'catalog',
  title: 'actions.product.update.title',
  description: 'Update fields of a product. Example: {"product_id":"pd_1","patch":{"price":"12500000"}}',
  // `if_version` = version của bản đang mở (concurrency §1) — lệch → STALE_VERSION 409. Tồn sửa qua stock.adjust.
  input: z.object({ product_id: productId, patch: productFields.omit({ stock: true }).partial(), if_version: z.number().int().optional() }),
  output: z.object({ product_id: z.string(), version: z.number().int().optional() }),
  permission: 'catalog.manage',
  risk: 'write',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['catalog'],
});

export const productArchive = defineAction({
  id: 'product.archive',
  module: 'catalog',
  title: 'actions.product.archive.title',
  description:
    'Archive (soft-delete) a product; past quotes / orders keep their lines. Example: {"product_id":"pd_6"}',
  input: z.object({ product_id: productId }),
  output: z.object({ product_id: z.string() }),
  permission: 'catalog.manage',
  risk: 'delete',
  agentGrantable: false,
  undo: { windowSec: 2_592_000 },
  invalidates: ['catalog'],
});

export const categoryCreate = defineAction({
  id: 'category.create',
  module: 'catalog',
  title: 'actions.category.create.title',
  description: 'Create a product category. Example: {"name":"Thẻ thành viên"}',
  input: z.object({ name: z.string().trim().min(1).max(60) }),
  output: z.object({ name: z.string() }),
  permission: 'catalog.manage',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['catalog'],
});

export const stockAdjust = defineAction({
  id: 'stock.adjust',
  module: 'catalog',
  title: 'actions.stock.adjust.title',
  description:
    'Adjust stock of a physical product (reason required); writes stock_movement(kind=adjust). Example: {"product_id":"pd_5","delta":20,"reason":"Nhập kho"}',
  input: z.object({
    product_id: productId,
    delta: z.number().int(),
    reason: z.string().trim().min(1).max(200),
  }),
  output: z.object({ product_id: z.string(), stock: z.number(), low_stock: z.boolean().optional() }),
  permission: 'stock.adjust',
  risk: 'write',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['catalog'],
});

const productHit = z.object({
  product_id: z.string(),
  code: z.string(),
  name: z.string(),
  type: z.string(),
  category: z.string(),
  price: z.string(),
  unit: z.string(),
  tax_rate: z.number(),
  stock: z.number().nullable(),
  status: z.string(),
});

export const productSearch = defineAction({
  id: 'product.search',
  module: 'catalog',
  title: 'actions.product.search.title',
  description:
    'Search active products / services by name or code (no accents needed) and get the CURRENT price (VND, excluding VAT), tax rate, unit and stock. Always use this for prices and stock — never the knowledge base. Example: {"query":"hifu","type":"package"}',
  input: z.object({ query: z.string().trim().max(100).default(''), type: z.enum(['physical', 'service', 'combo', 'package', 'digital', 'rental']).optional(), limit: z.number().int().min(1).max(20).optional() }),
  output: z.object({ items: z.array(productHit) }),
  permission: 'catalog.view',
  risk: 'read',
  agentGrantable: true,
  skill: true,
  invalidates: [],
});

export const productGet = defineAction({
  id: 'product.get',
  module: 'catalog',
  title: 'actions.product.get.title',
  description: 'Get one product with description, attributes, combo components, active variants and current price / stock. Example: {"product_id":"…"} or {"code":"SP-1001"}',
  input: z.object({ product_id: z.string().optional(), code: z.string().max(40).optional() }).refine((v) => !!(v.product_id || v.code), { message: 'product_id_or_code', path: ['product_id'] }),
  output: productHit.extend({
    description: z.string(),
    /** Mô tả có định dạng (TIP-027b) — vắng = sản phẩm chỉ có chữ thuần. */
    description_doc: descriptionDocSchema.optional(),
    attrs: z.array(z.object({ name: z.string(), values: z.array(z.string()) })),
    components: z.array(z.object({ product_id: z.string(), name: z.string(), qty: z.number() })),
    duration_min: z.number().nullable(),
    sessions: z.number().nullable(),
    valid_days: z.number().nullable(),
    /** Biến thể đang bán (TIP-032b — mã cho product_variant.update / archive). */
    variants: z.array(z.object({ variant_id: z.string(), name: z.string(), sku: z.string(), price: z.string().nullable() })).optional(),
  }),
  permission: 'catalog.view',
  risk: 'read',
  agentGrantable: true,
  skill: true,
  invalidates: [],
});

export const stockGet = defineAction({
  id: 'stock.get',
  module: 'catalog',
  title: 'actions.stock.get.title',
  description: 'Current stock of physical products (negative = oversold, low = at or below the warning threshold). Example: {"product_ids":["…"]}',
  input: z.object({ product_ids: z.array(z.string().min(1)).min(1).max(50) }),
  output: z.object({ items: z.array(z.object({ product_id: z.string(), name: z.string(), stock: z.number().nullable(), low: z.boolean() })) }),
  permission: 'catalog.view',
  risk: 'read',
  agentGrantable: true,
  skill: true,
  invalidates: [],
});
