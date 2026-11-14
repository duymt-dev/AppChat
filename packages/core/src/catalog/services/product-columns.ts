// Ánh xạ input action (`tax_rate`, `duration_min`, tiền string) → cột product, và ảnh chụp cột sửa được cho undo của update.
import { TenantSql } from '@appchat/db';
import type { TenantTx } from '../../kernel/actions/action-context';
import { writeComponents } from './catalog-write';

export interface ColumnInput {
  cost?: string;
  tax_rate?: 0 | 5 | 8 | 10;
  status?: 'active' | 'draft';
  duration_min?: number;
  sessions?: number;
  valid_days?: number;
  grant_on_deposit?: boolean;
  deposit?: string;
  rental_unit?: 'hour' | 'day' | 'week' | 'month';
  low_stock_threshold?: number;
}

/** Cột đơn giản (không cần tra cứu) — chỉ key được gửi. */
export function columnsOf(i: ColumnInput) {
  return {
    ...(i.cost !== undefined ? { cost: i.cost === '' ? null : BigInt(i.cost) } : {}),
    ...(i.tax_rate !== undefined ? { taxRate: i.tax_rate } : {}),
    ...(i.status !== undefined ? { status: i.status } : {}),
    ...(i.duration_min !== undefined ? { durationMin: i.duration_min || null } : {}),
    ...(i.sessions !== undefined ? { sessions: i.sessions } : {}),
    ...(i.valid_days !== undefined ? { validDays: i.valid_days } : {}),
    ...(i.grant_on_deposit !== undefined ? { grantOnDeposit: i.grant_on_deposit } : {}),
    ...(i.deposit !== undefined ? { deposit: i.deposit === '' ? null : BigInt(i.deposit) } : {}),
    ...(i.rental_unit !== undefined ? { rentalUnit: i.rental_unit } : {}),
    ...(i.low_stock_threshold !== undefined ? { lowStockThreshold: i.low_stock_threshold } : {}),
  };
}

export interface ProductSnapshot {
  id: string;
  code: string;
  name: string;
  categoryId: string | null;
  price: string;
  cost: string | null;
  unit: string;
  taxRate: number;
  status: 'active' | 'draft';
  description: string;
  /** TIP-027b — tài liệu có định dạng (null = chữ thuần cũ). */
  descriptionDoc?: unknown;
  durationMin: number | null;
  sessions: number | null;
  validDays: number | null;
  grantOnDeposit?: boolean;
  deposit: string | null;
  rentalUnit: string | null;
  lowStockThreshold: number | null;
  attrs: unknown;
  custom: unknown;
  components: { childId: string; qty: number }[];
}

type Row = Omit<ProductSnapshot, 'price' | 'cost' | 'deposit' | 'components' | 'status' | 'descriptionDoc'> & { price: bigint; cost: bigint | null; deposit: bigint | null; status: string; descriptionDoc?: unknown };

export async function snapshot(tx: TenantTx, p: Row): Promise<ProductSnapshot> {
  const components = await tx.productComponent.findMany({ where: { productId: p.id }, select: { childId: true, qty: true } });
  return {
    id: p.id, code: p.code, name: p.name, categoryId: p.categoryId, price: String(p.price), cost: p.cost === null ? null : String(p.cost),
    unit: p.unit, taxRate: p.taxRate, status: p.status === 'draft' ? 'draft' : 'active', description: p.description, descriptionDoc: p.descriptionDoc ?? null, durationMin: p.durationMin,
    sessions: p.sessions, validDays: p.validDays, grantOnDeposit: p.grantOnDeposit ?? false, deposit: p.deposit === null ? null : String(p.deposit), rentalUnit: p.rentalUnit,
    lowStockThreshold: p.lowStockThreshold, attrs: p.attrs, custom: p.custom, components,
  };
}

/** Khôi phục ảnh chụp (undo của update) — biến thể đã sinh giữ nguyên (tồn biến thể không mất khi hoàn tác). */
export async function restoreSnapshot(tx: TenantTx, b: ProductSnapshot, now: Date): Promise<void> {
  const { id, components, price, cost, deposit, attrs, custom, descriptionDoc, ...cols } = b;
  await tx.product.update({
    where: { id },
    data: {
      ...cols,
      price: BigInt(price),
      cost: cost === null ? null : BigInt(cost),
      deposit: deposit === null ? null : BigInt(deposit),
      attrs: (attrs ?? []) as object,
      custom: (custom ?? {}) as object,
      // Ảnh chụp trước TIP-027b không có khoá → giữ nguyên tài liệu (không xoá định dạng đã thêm sau).
      ...(descriptionDoc !== undefined ? { descriptionDoc: descriptionDoc === null ? TenantSql.DbNull : (descriptionDoc as object) } : {}),
      version: { increment: 1 },
      updatedAt: now,
    },
  });
  await writeComponents(tx, id, components);
}
