// Ghi đơn dùng chung cho handler / đồng bộ sàn (transaction của executor — COMMERCE §4): dòng hàng + tổng (quoteTotals, đơn giá chưa
// VAT), `pay_status` tổng hợp (payStatusOf — mọi chỗ đổi đã thu / cọc gọi `payCols`), nhật ký `order_event`, kho: xác nhận → trừ theo
// dòng (combo trừ theo thành phần), huỷ → hoàn đúng các dòng đã trừ; `product.sold` đi cùng. Đơn sàn với kho gốc ở sàn
// (`stock_master = external`) vẫn ghi sổ kho (COMMERCE §4b — quy tắc Q8 giữ nguyên).
import { AppError, payStatusOf, quoteTotals, validateCustomValues, type CustomValues, type Discount, type Totals } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { uuidv7 } from '../../../kernel/ids';
import { actorUserId, fieldDefs, type CrmMembers } from '../../../crm/public';
import { recordMovement } from '../../../catalog/public';
import type { OrderRecord } from '../order-access';
import type { LineIn } from '../../quotes/services/quote-write';

export type Actor = { type: string; id: string | null };
export const actorOf = (ctx: ActionContext): Actor => ({ type: ctx.actor.type, id: ctx.actor.type === 'agent' ? ctx.actor.id : actorUserId(ctx) });

export const EMPTY_SHIPPING = { carrier: '', tracking: '', eta: '', address: '', receiver: '', receiver_phone: '' };
export type Shipping = typeof EMPTY_SHIPPING;

export function totalCols(t: Totals) {
  return {
    subtotal: BigInt(t.subtotal),
    lineDiscountTotal: BigInt(t.line_discount_total),
    discountTotal: BigInt(t.discount_total),
    taxTotal: BigInt(t.tax_total),
    total: BigInt(t.total),
  };
}

/** `pay_status` từ số liệu sau khi đổi (cột lưu để lọc chip — COMMERCE §4). */
export const payCols = (o: Pick<OrderRecord, 'status' | 'total' | 'paidTotal' | 'refundedTotal' | 'depositRequired' | 'depositAmount'>) => ({
  payStatus: payStatusOf({ status: o.status, total: o.total, paid: o.paidTotal, refunded: o.refundedTotal, depositRequired: o.depositRequired, depositAmount: o.depositAmount }),
});

export async function writeItems(tx: TenantTx, orderId: string, lines: (LineIn & { variant_id?: string | null })[], t: Pick<Totals, 'lines'>, now: Date) {
  await tx.orderItem.deleteMany({ where: { orderId } });
  // Ảnh chụp liệu trình lúc ghi dòng (TIP-032b, COMMERCE §6): sinh gói đọc ở dòng đơn, đổi danh mục sau này không đổi gói.
  const ids = [...new Set(lines.map((l) => l.product_id).filter((x): x is string => !!x))];
  const products = ids.length ? await tx.product.findMany({ where: { id: { in: ids } }, select: { id: true, type: true, sessions: true, validDays: true, grantOnDeposit: true } }) : [];
  const byId = new Map(products.map((p) => [p.id, p]));
  await tx.orderItem.createMany({
    data: lines.map((l, i) => {
      const p = l.product_id ? byId.get(l.product_id) : undefined;
      const pkg = p?.type === 'package';
      return {
        id: uuidv7(now.getTime()),
        orderId,
        productId: l.product_id ?? null,
        variantId: l.variant_id ?? null,
        name: l.name,
        variant: l.variant ?? '',
        qty: l.qty,
        unitPrice: BigInt(l.unit_price),
        discount: (l.discount ?? undefined) as object | undefined,
        taxRate: l.tax_rate,
        lineTotal: BigInt(t.lines[i]!.net),
        sort: i,
        productType: p?.type ?? null,
        packageSessions: pkg ? p.sessions : null,
        packageValidDays: pkg ? p.validDays : null,
        grantOnDeposit: pkg ? p.grantOnDeposit : false,
        snapshotAt: p ? now : null,
      };
    }),
  });
}

export async function itemsOf(tx: TenantTx, orderId: string): Promise<LineIn[]> {
  const rows = await tx.orderItem.findMany({ where: { orderId }, orderBy: { sort: 'asc' } });
  return rows.map((r) => ({
    ...(r.productId ? { product_id: r.productId } : {}),
    name: r.name,
    variant: r.variant,
    qty: Number(r.qty),
    unit_price: String(r.unitPrice),
    tax_rate: r.taxRate,
    discount: (r.discount as Discount | null) ?? null,
  }));
}

/** Tổng của đơn theo dòng + chiết khấu tổng. */
export const totalsOf = (lines: LineIn[], header: Discount | null | undefined) => quoteTotals(lines, header ?? null);

export async function logEvent(tx: TenantTx, orderId: string, type: string, actor: Actor, now: Date, extra: { amount?: bigint; points?: number; reason?: string } = {}) {
  const id = uuidv7(now.getTime());
  await tx.orderEvent.create({ data: { id, orderId, type, actorType: actor.type, actorId: actor.id, amount: extra.amount ?? null, points: extra.points ?? null, reason: extra.reason ?? null, createdAt: now } });
  return id;
}

export async function checkOrderCustom(ctx: ActionContext, tx: TenantTx, members: CrmMembers, values: CustomValues | undefined, mode: 'create' | 'update') {
  if (mode === 'update' && values === undefined) return;
  const me = actorUserId(ctx);
  const role = ctx.authz.isOwner ? 'owner' : await members.roleOf(ctx.workspaceId, me);
  const errs = validateCustomValues(await fieldDefs(tx, 'order'), values, role, mode);
  if (Object.keys(errs).length) throw new AppError('VALIDATION_FAILED', 422, errs);
}

/** Đổi trạng thái có điều kiện (concurrency §2): `WHERE id AND status = cũ` — 0 dòng → 409. */
export async function moveOrder(tx: TenantTx, o: Pick<OrderRecord, 'id' | 'status'>, to: OrderRecord['status'], data: Record<string, unknown>, now: Date) {
  const n = await tx.order.updateMany({ where: { id: o.id, status: o.status, deletedAt: null }, data: { ...data, status: to, updatedAt: now } });
  if (!n.count) throw new AppError('INVALID_TRANSITION', 409, { status: o.status });
}

type StockLine = { productId: string; qty: number };

/** Dòng cần trừ kho: sản phẩm có quản lý tồn (physical — `stock` khác null); combo / gói trừ theo thành phần (COMMERCE §2). */
async function stockLines(tx: TenantTx, orderId: string): Promise<StockLine[]> {
  const items = await tx.orderItem.findMany({ where: { orderId, productId: { not: null } }, select: { productId: true, qty: true } });
  if (!items.length) return [];
  const ids = [...new Set(items.map((i) => i.productId!))];
  const products = await tx.product.findMany({ where: { id: { in: ids } }, select: { id: true, stock: true, components: { select: { childId: true, qty: true } } } });
  const byId = new Map(products.map((p) => [p.id, p]));
  const childIds = [...new Set(products.flatMap((p) => p.components.map((c) => c.childId)))];
  const children = new Map((childIds.length ? await tx.product.findMany({ where: { id: { in: childIds } }, select: { id: true, stock: true } }) : []).map((c) => [c.id, c]));
  const acc = new Map<string, number>();
  const add = (id: string, q: number) => acc.set(id, (acc.get(id) ?? 0) + q);
  for (const it of items) {
    const p = byId.get(it.productId!);
    if (!p) continue;
    const qty = Math.ceil(Number(it.qty));
    if (p.components.length) {
      for (const c of p.components) {
        const child = children.get(c.childId);
        if (child && child.stock !== null) add(c.childId, qty * c.qty);
      }
    } else if (p.stock !== null) add(p.id, qty);
  }
  return [...acc].map(([productId, qty]) => ({ productId, qty }));
}

/** Đã bán (`product.sold`) theo dòng bán ra — combo tính cho chính combo. */
async function bumpSold(tx: TenantTx, orderId: string, sign: 1 | -1) {
  const items = await tx.orderItem.findMany({ where: { orderId, productId: { not: null } }, select: { productId: true, qty: true } });
  for (const it of items) await tx.product.updateMany({ where: { id: it.productId! }, data: { sold: { increment: sign * Math.ceil(Number(it.qty)) } } });
}

/**
 * Trừ kho khi xác nhận (new → processing). `ref` mới mỗi lần trừ (sổ kho idempotent theo (ref_type, ref_id, product_id)) — lưu vào
 * `order.stock_ref` để huỷ / hoàn tác hoàn đúng lần đó. Trả danh sách sản phẩm xuống dưới ngưỡng (cảnh báo, không chặn — §2).
 */
export async function deductStock(tx: TenantTx, o: Pick<OrderRecord, 'id' | 'code'>, actor: Actor, now: Date) {
  const ref = `${o.id}:${uuidv7(now.getTime())}`;
  const low: string[] = [];
  for (const l of await stockLines(tx, o.id)) {
    const r = await recordMovement(tx, { productId: l.productId, kind: 'sale', qty: -l.qty, refType: 'order', refId: ref, reason: o.code, actorId: actor.id }, now);
    if (r.low) low.push(l.productId);
  }
  await bumpSold(tx, o.id, 1);
  await tx.order.update({ where: { id: o.id }, data: { stockRef: ref } });
  return { ref, low };
}

/** Hoàn kho của lần trừ đang hiệu lực (huỷ đơn / hoàn tác xác nhận). Không có lần trừ → bỏ qua. */
export async function returnStock(tx: TenantTx, o: Pick<OrderRecord, 'id' | 'code' | 'stockRef'>, actor: Actor, now: Date) {
  if (!o.stockRef) return;
  const sold = await tx.stockMovement.findMany({ where: { refType: 'order', refId: o.stockRef, kind: 'sale' }, select: { productId: true, qty: true } });
  for (const m of sold) {
    await recordMovement(tx, { productId: m.productId, kind: 'return', qty: -m.qty, refType: 'order_return', refId: o.stockRef, reason: o.code, actorId: actor.id }, now);
  }
  await bumpSold(tx, o.id, -1);
  await tx.order.update({ where: { id: o.id }, data: { stockRef: null } });
}
