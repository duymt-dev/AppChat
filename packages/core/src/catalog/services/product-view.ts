// Bản ghi product → dòng FE (`productRowSchema` — packages/shared/src/api/catalog.ts). Giá vốn ẩn ('0') khi người xem thiếu
// `catalog.cost_view` (Blueprint §3.5 bảng quyền: Sales thấy sản phẩm, không thấy giá vốn). Nền / icon thẻ theo màu danh mục.
import { categoryPal, createFmt, interpolate, serverMessages, type AuthzContext, type CustomValues, type ProductRowDto } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { lowOf, type Attr } from './catalog-write';

export const PRODUCT_SELECT = {
  id: true, code: true, name: true, type: true, categoryId: true, price: true, cost: true, unit: true, taxRate: true, stock: true,
  lowStockThreshold: true, durationMin: true, sessions: true, validDays: true, grantOnDeposit: true, deposit: true, rentalUnit: true, attrs: true,
  description: true, status: true, custom: true, sold: true, version: true,
} as const;

export interface ProductRecord {
  id: string;
  code: string;
  name: string;
  type: ProductRowDto['type'];
  categoryId: string | null;
  price: bigint;
  cost: bigint | null;
  unit: string;
  taxRate: number;
  stock: number | null;
  lowStockThreshold: number | null;
  durationMin: number | null;
  sessions: number | null;
  validDays: number | null;
  grantOnDeposit: boolean;
  deposit: bigint | null;
  rentalUnit: string | null;
  attrs: unknown;
  description: string;
  status: 'active' | 'draft' | 'archived';
  custom: unknown;
  sold: number;
  version: number;
}

export interface ViewCtx {
  authz: AuthzContext;
  locale: string;
  categories: Map<string, { name: string; color: string }>;
  /** Kênh bán đang hiện sản phẩm = loại kênh đã kết nối của workspace. */
  channels: string[];
}

export const attrsOf = (v: unknown): Attr[] =>
  Array.isArray(v) ? (v as Attr[]).filter((a) => a && typeof a.name === 'string' && Array.isArray(a.values)) : [];

export const canCost = (a: AuthzContext) => a.isOwner || a.permissions.has('catalog.cost_view');

/** Nhãn thuộc tính của dòng bảng / thẻ kanban: thông số theo loại trước, rồi "Tên: a/b". */
export function labelsOf(p: ProductRecord, locale: string, parts: number): string[] {
  const m = serverMessages(locale).catalog.label;
  const fmt = createFmt({ locale });
  const out: string[] = [];
  if (p.durationMin) out.push(interpolate(m.duration, { n: p.durationMin }));
  if (p.sessions) out.push(interpolate(m.sessions, { n: p.sessions }));
  if (p.validDays) out.push(interpolate(m.valid, { n: p.validDays }));
  if (p.type === 'combo' && parts) out.push(interpolate(m.parts, { n: parts }));
  if (p.deposit) out.push(interpolate(m.deposit, { money: fmt.money(String(p.deposit)) }));
  for (const a of attrsOf(p.attrs)) out.push(`${a.name}: ${a.values.join('/')}`);
  return out;
}

export function toRow(p: ProductRecord, v: ViewCtx, parts = 0): ProductRowDto {
  const cat = p.categoryId ? v.categories.get(p.categoryId) : undefined;
  const [tint, ink, icon] = categoryPal(cat?.color);
  return {
    id: p.id,
    code: p.code,
    name: p.name,
    category: cat?.name ?? '',
    type: p.type,
    price: String(p.price),
    cost: canCost(v.authz) && p.cost !== null ? String(p.cost) : '0',
    unit: p.unit,
    tax_rate: p.taxRate,
    sold: p.sold,
    status: p.status === 'draft' ? 'draft' : 'active',
    channels: p.status === 'active' ? v.channels : [],
    description: p.description,
    attrs: labelsOf(p, v.locale, parts),
    stock: p.stock,
    sessions: p.sessions,
    valid_days: p.validDays,
    grant_on_deposit: p.grantOnDeposit,
    tint,
    ink,
    icon,
    custom: (p.custom ?? {}) as CustomValues,
    version: p.version,
    duration_min: p.durationMin,
    deposit: p.deposit === null ? null : String(p.deposit),
    rental_unit: p.rentalUnit,
    low_stock: lowOf(p.stock, p.lowStockThreshold),
  };
}

export async function categoryMap(tx: TenantTx) {
  const rows = await tx.productCategory.findMany({ orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }], select: { id: true, name: true, color: true } });
  return { rows, map: new Map(rows.map((r) => [r.id, { name: r.name, color: r.color }])) };
}

/** Loại kênh đang kết nối (không tạm dừng) — "Kênh bán" của sản phẩm + KPI số kênh. */
export async function connectedChannelTypes(tx: TenantTx): Promise<string[]> {
  const rows = await tx.channelAccount.findMany({ where: { status: 'connected', pausedAt: null }, select: { type: true }, distinct: ['type'] });
  return rows.map((r) => r.type).sort();
}

/** Số thành phần combo theo sản phẩm (nhãn "Gồm: n món"). */
export async function partCounts(tx: TenantTx, ids: string[]) {
  if (!ids.length) return new Map<string, number>();
  const g = await tx.productComponent.groupBy({ by: ['productId'], where: { productId: { in: ids } }, _count: { _all: true } });
  return new Map(g.map((x) => [x.productId, x._count._all]));
}
