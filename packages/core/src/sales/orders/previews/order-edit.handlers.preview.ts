// Preview sửa đơn (TIP-023b R2.8): sửa → trước / sau chỉ trường đổi (dòng đổi → số dòng + tổng mới; người phụ trách vận hành theo tên; `if_version` lệch → 409 như execute), đơn sàn /
// đã thu tiền mà đổi tiền → 409 như execute; đổi dòng khi đang xử lý → cảnh báo hoàn kho rồi trừ lại; cọc → trước / sau + trạng thái thanh
// toán mới; vận chuyển → trước / sau từng trường. Chỉ đọc.
import type { ActionInput, ActionPreview, orderSetDeposit, orderUpdate, orderUpdateShipping } from '@appchat/actions';
import { AppError, ORDER_FLOW, SHIPPING_EDITABLE, assertTransition, assertVersion, type Discount } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { defined, preview, updated } from '../../../kernel/actions/preview-kit';
import type { CrmMembers } from '../../../crm/public';
import { visibleOrder } from '../order-access';
import { EMPTY_SHIPPING, itemsOf, payCols, totalsOf, type Shipping } from '../services/order-write';
import { label } from './order-create.handlers.preview';
import { checkOwnerEcho } from '../editing/order-assignment';

async function editable(ctx: ActionContext, tx: TenantTx, id: string, action: string, ifVersion?: number) {
  const o = await visibleOrder(tx, ctx.authz, id, 'write');
  assertVersion(o.version, ifVersion);
  assertTransition(ORDER_FLOW, o.status, action);
  return o;
}

export async function updatePreview(ctx: ActionContext, tx: TenantTx, members: CrmMembers, i: ActionInput<typeof orderUpdate>): Promise<ActionPreview> {
  const o = await editable(ctx, tx, i.order_id, 'order.update', i.if_version);
  const p = i.patch;
  checkOwnerEcho(p.owner_user_id, o.ownerUserId);
  const money = p.items !== undefined || p.header_discount !== undefined || p.deposit_amount !== undefined || p.shipping !== undefined;
  if (o.lockedLines && money) throw new AppError('INVALID_STATE', 409, { order_id: 'locked_lines' });
  if (o.status === 'processing' && o.paidTotal > 0n && money) throw new AppError('INVALID_STATE', 409, { order_id: 'paid' });
  const stored = await itemsOf(tx, o.id);
  const header = p.header_discount !== undefined ? p.header_discount : ((o.headerDiscount as Discount | null) ?? null);
  const t = totalsOf(p.items ?? stored, header);
  if (BigInt(p.deposit_amount ?? String(o.depositAmount)) > BigInt(t.total)) throw new AppError('VALIDATION_FAILED', 422, { 'patch.deposit_amount': 'over_total' });
  const names = await members.names([o.assignedUserId, p.assigned_user_id ?? null]);
  const name = (id: string | null | undefined) => (id ? (names.get(id) ?? id) : null);
  const cur = { assigned: name(o.assignedUserId), items: stored.length, total: String(o.total), deposit: String(o.depositAmount), note: o.note };
  const patch = { assigned: p.assigned_user_id !== undefined ? name(p.assigned_user_id) : undefined, items: p.items?.length, total: p.items || p.header_discount !== undefined ? t.total : undefined, deposit: p.deposit_amount, note: p.note?.trim() };
  const restock = !!p.items && o.status === 'processing' && !!o.stockRef;
  return preview('write', await label(tx, o), { changes: updated('order', o.id, cur, patch), ...(restock ? { warnings: ['restock'] } : {}) });
}

export async function depositPreview(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof orderSetDeposit>): Promise<ActionPreview> {
  const o = await editable(ctx, tx, i.order_id, 'order.set_deposit', i.if_version);
  if (o.lockedLines) throw new AppError('INVALID_STATE', 409, { order_id: 'locked_lines' });
  const deposit = BigInt(i.deposit_amount);
  if (deposit > o.total) throw new AppError('VALIDATION_FAILED', 422, { deposit_amount: 'over_total' });
  const pay = payCols({ ...o, depositRequired: deposit > 0n, depositAmount: deposit }).payStatus;
  return preview('write', await label(tx, o), { changes: updated('order', o.id, { deposit: String(o.depositAmount), pay_status: o.payStatus }, { deposit: String(deposit), pay_status: pay }) });
}

export async function shippingPreview(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof orderUpdateShipping>): Promise<ActionPreview> {
  const o = await visibleOrder(tx, ctx.authz, i.order_id, 'write');
  assertVersion(o.version, i.if_version);
  if (!SHIPPING_EDITABLE.includes(o.status)) throw new AppError('INVALID_TRANSITION', 409, { status: o.status });
  const cur: Shipping = { ...EMPTY_SHIPPING, ...(o.shipping as Partial<Shipping>) };
  const next = defined(Object.fromEntries(Object.entries(i.shipping).map(([k, v]) => [k, v === undefined ? undefined : String(v ?? '').trim()])));
  return preview('write', await label(tx, o), { changes: updated('order_shipping', o.id, cur, next) });
}
