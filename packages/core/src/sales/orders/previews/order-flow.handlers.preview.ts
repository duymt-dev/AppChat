// Preview trạng thái đơn (TIP-023b R2.8): xác nhận → trạng thái + số dòng trừ kho + sản phẩm sẽ xuống dưới ngưỡng (cảnh báo, không chặn
// — COMMERCE §2); hoàn tất (risk money) → trạng thái + tổng + điểm dự tính (cùng snapshot loyalty với hoàn tất thật — cấu hình, hạng,
// thực thu; đơn sàn theo `marketplace_earn` — §7, §4b); huỷ (risk money) → lý do + hoàn kho + đã thu → yêu cầu hoàn tiền chờ duyệt. Chỉ đọc — không trừ kho.
import type { ActionInput, ActionPreview, orderCancel, orderComplete, orderConfirm } from '@appchat/actions';
import { ORDER_FLOW, assertTransition } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { lowOf } from '../../../catalog/public';
import { line, preview, updated } from '../../../kernel/actions/preview-kit';
import { visibleOrder } from '../order-access';
import { earnSnapshot } from '../../../loyalty/services/order-points';
import { label, money } from './order-create.handlers.preview';

async function flowOf(ctx: ActionContext, tx: TenantTx, id: string, action: string) {
  const o = await visibleOrder(tx, ctx.authz, id, 'write');
  return { o, to: assertTransition(ORDER_FLOW, o.status, action), name: await label(tx, o) };
}

/** Tồn sau khi trừ theo dòng (combo theo thành phần) — tên sản phẩm xuống dưới ngưỡng. */
async function lowAfter(tx: TenantTx, orderId: string) {
  const items = await tx.orderItem.findMany({ where: { orderId, productId: { not: null } }, select: { productId: true, qty: true } });
  const products = await tx.product.findMany({ where: { id: { in: [...new Set(items.map((i) => i.productId!))] } }, select: { id: true, components: { select: { childId: true, qty: true } } } });
  const byId = new Map(products.map((p) => [p.id, p]));
  const need = new Map<string, number>();
  for (const it of items) {
    const p = byId.get(it.productId!);
    const qty = Math.ceil(Number(it.qty));
    if (p?.components.length) for (const c of p.components) need.set(c.childId, (need.get(c.childId) ?? 0) + qty * c.qty);
    else if (p) need.set(p.id, (need.get(p.id) ?? 0) + qty);
  }
  const stock = await tx.product.findMany({ where: { id: { in: [...need.keys()] }, stock: { not: null } }, select: { id: true, name: true, stock: true, lowStockThreshold: true } });
  return { lines: stock.length, low: stock.filter((s) => lowOf(s.stock! - need.get(s.id)!, s.lowStockThreshold)).map((s) => s.name) };
}

export async function confirmPreview(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof orderConfirm>): Promise<ActionPreview> {
  const { o, to, name } = await flowOf(ctx, tx, i.order_id, 'order.confirm');
  const s = await lowAfter(tx, o.id);
  return preview('write', line(name, money(o.total)), {
    changes: updated('order', o.id, { status: o.status, stock_lines: 0 }, { status: to, stock_lines: s.lines }),
    ...(s.low.length ? { warnings: s.low.map((n) => `low_stock:${n}`) } : {}),
  });
}

export async function completePreview(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof orderComplete>): Promise<ActionPreview> {
  const { o, to, name } = await flowOf(ctx, tx, i.order_id, 'order.complete');
  return preview('money', line(name, money(o.total)), { changes: updated('order', o.id, { status: o.status, points: 0 }, { status: to, total: String(o.total), points: (await earnSnapshot(tx, o)).points }) });
}

export async function cancelPreview(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof orderCancel>): Promise<ActionPreview> {
  const { o, to, name } = await flowOf(ctx, tx, i.order_id, 'order.cancel');
  const paid = o.paidTotal - o.refundedTotal;
  const warnings = [...(o.stockRef ? ['restock'] : []), ...(paid > 0n ? [`refund_request:${paid}`] : [])];
  return preview('money', line(name, money(o.total)), {
    changes: updated('order', o.id, { status: o.status, reason: null }, { status: to, reason: i.reason.trim() }),
    ...(warnings.length ? { warnings } : {}),
  });
}
