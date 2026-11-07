// Shape đọc domain catalog (FE ↔ BE — gap-filling §5, TIP-027): GET /v1/products (D42), /products/:id, /products/meta,
// /products/:id/activity, /categories. Mock transport (apps/web) và API thật parse cùng các schema này. Tiền là string VND, giá chưa VAT.
import { z } from 'zod';
import { hiddenFieldsSchema } from './field-visibility';

export const PRODUCT_TYPES = ['physical', 'service', 'combo', 'package', 'digital', 'rental'] as const;
export type ProductTypeKey = (typeof PRODUCT_TYPES)[number];

const customValues = z.record(z.string(), z.union([z.string(), z.number(), z.array(z.string()), z.null()]));

export const productRowSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  /** Tên danh mục ('' = chưa phân loại). */
  category: z.string(),
  type: z.enum(PRODUCT_TYPES),
  price: z.string(),
  /** Giá vốn; null = chưa nhập. KHÔNG có khoá khi người xem thiếu `catalog.cost_view` (→ `hidden_fields` chứa 'cost'). */
  cost: z.string().nullable().optional(),
  unit: z.string(),
  tax_rate: z.number().int(),
  sold: z.number().int(),
  status: z.enum(['active', 'draft']),
  /** Kênh bán đang hiện sản phẩm (kênh đã kết nối ở Kênh). */
  channels: z.array(z.string()),
  description: z.string(),
  /** Nhãn thuộc tính "Tên: a/b" (bảng, thẻ kanban). */
  attrs: z.array(z.string()),
  stock: z.number().int().nullable(),
  sessions: z.number().int().nullable(),
  valid_days: z.number().int().nullable(),
  /** TIP-032b — liệu trình sinh khi mới cọc. */
  grant_on_deposit: z.boolean().optional(),
  tint: z.string(),
  ink: z.string(),
  icon: z.string(),
  custom: customValues.optional(),
  hidden_fields: hiddenFieldsSchema,
  /** TIP-027 — chi tiết / form sửa. */
  version: z.number().int().optional(),
  duration_min: z.number().int().nullable().optional(),
  deposit: z.string().nullable().optional(),
  rental_unit: z.string().nullable().optional(),
  low_stock: z.boolean().optional(),
  components: z.array(z.object({ id: z.string(), name: z.string(), qty: z.number().int() })).optional(),
  attr_defs: z.array(z.object({ name: z.string(), values: z.array(z.string()) })).optional(),
  variants: z.array(z.object({ id: z.string(), sku: z.string(), name: z.string(), stock: z.number().int(), price: z.string().nullable().optional(), version: z.number().int().optional() })).optional(),
});
export type ProductRowDto = z.infer<typeof productRowSchema>;

export const productsPageSchema = z.object({
  data: z.array(productRowSchema),
  next_cursor: z.string().nullable(),
  meta: z.object({ total: z.number().int(), page: z.number().int(), limit: z.number().int() }),
});

const triple = z.tuple([z.string(), z.string(), z.string()]);

export const productsMetaSchema = z.object({
  categories: z.array(z.string()),
  category_color: z.record(z.string(), z.string()),
  category_pal: z.record(z.string(), triple),
  /** Kênh bán: `synced` = kênh đã kết nối (sản phẩm dùng làm căn cứ trả lời), `soon` = connector chưa có (D04). */
  sync_sources: z.array(z.object({ key: z.string(), color: z.string(), status: z.enum(['synced', 'soon']), at: z.string().optional() })),
  stats: z.object({ total: z.number().int(), active: z.number().int(), channels: z.number().int(), sold_month: z.number().int() }),
  files: z.array(triple),
  history: z.array(triple),
  crm_stats: z.array(triple),
  crm_buyers: z.array(triple),
});

/** `GET /products/:id/activity` — lịch sử sản phẩm (nhật ký thao tác + sổ kho), mới nhất trước. */
export const productActivitySchema = z.array(
  z.object({ id: z.string(), kind: z.enum(['create', 'update', 'price', 'archive', 'restore', 'stock']), text: z.string(), by: z.string(), at: z.string(), when: z.string() }),
);

export const categoriesSchema = z.array(z.object({ id: z.string(), name: z.string(), color: z.string(), count: z.number().int() }));
