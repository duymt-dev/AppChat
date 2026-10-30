// Sản phẩm & dịch vụ (Blueprint §3.4 catalog; COMMERCE-DECISIONS §2). Prototype L5624–5753, L4069–4160.
import { z } from 'zod';
import { customValuesSchema } from '@appchat/shared';
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
  sku: z.string().max(40).optional(),
  stock: z.number().int().optional(),
  duration_min: z.number().int().min(0).optional(),
  sessions: z.number().int().min(1).optional(),
  valid_days: z.number().int().min(1).optional(),
  deposit: money.optional(),
  rental_unit: z.enum(['hour', 'day', 'week', 'month']).optional(),
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
  input: z.object({ product_id: productId, patch: productFields.partial() }),
  output: z.object({ product_id: z.string() }),
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
  output: z.object({ product_id: z.string(), stock: z.number() }),
  permission: 'stock.adjust',
  risk: 'write',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['catalog'],
});
