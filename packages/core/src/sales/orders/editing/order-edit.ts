// Sửa đơn có CAS (TIP-032c §2–§3, COMMERCE §4 / §4b): khoá khách gốc → đơn → quyền GHI hiện tại → `if_version`, rồi mới dựng patch / đụng
// kho. Người tạo bất biến; người phụ trách là `assigned_user_id`. Đơn sàn chỉ sửa người phụ trách / ghi chú / trường tuỳ biến. Biên nhận
// hoàn tác chỉ lưu tập trường đổi + giá trị trước của đúng các trường đó + `after_version` cuối (không chụp cả DTO, không có người tạo).
import { TenantSql } from '@appchat/db';
import { AppError, ORDER_FLOW, SHIPPING_EDITABLE, assertTransition, mergeCustomValues, type CustomValues, type Discount } from '@appchat/shared';
import type { ActionInput, orderSetDeposit, orderUpdate, orderUpdateShipping } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import type { CrmMembers } from '../../../crm/public';
import { resolveLines, type LineIn } from '../../quotes/services/quote-write';
import { EMPTY_SHIPPING, actorOf, checkOrderCustom, deductStock, itemsOf, logEvent, payCols, returnStock, totalCols, totalsOf, writeItems, type Shipping } from '../services/order-write';
import { checkAssignee, checkOwnerEcho } from './order-assignment';
import { lockOrderVersion, orderVersion } from './order-version';

export type OrderEditOp = 'order.update' | 'order.set_deposit' | 'order.update_shipping';

/** Biên nhận hoàn tác (action_log.before) — schema 2 (schema 1 = ảnh chụp cũ, không hoàn tác được). */
export interface OrderReceipt {
  schema_version: 2;
  op: OrderEditOp;
  id: string;
  fields: string[];
  before: {
    items?: LineIn[];
    header?: Discount | null;
    assigned?: string | null;
    note?: string;
    deposit?: string;
    shipping?: Partial<Shipping>;
    custom?: CustomValues;
  };
  after_version: number;
  event: string | null;
}

const shippingOf = (o: { shipping: unknown }): Shipping => ({ ...EMPTY_SHIPPING, ...(o.shipping as Partial<Shipping>) });
const pick = <T extends object>(src: T, keys: string[]) => Object.fromEntries(keys.map((k) => [k, (src as Record<string, unknown>)[k] ?? null]));

export async function editOrder(ctx: ActionContext, tx: TenantTx, members: CrmMembers, input: ActionInput<typeof orderUpdate>, now: Date) {
  const o = await lockOrderVersion(tx, ctx.authz, input.order_id, input.if_version);
  assertTransition(ORDER_FLOW, o.status, 'order.update');
  const p = input.patch;
  if (p.contact_id && p.contact_id !== o.contactId) throw new AppError('VALIDATION_FAILED', 422, { 'patch.contact_id': 'immutable' });
  if (p.contract_id !== undefined && p.contract_id !== (o.contractId ?? undefined)) throw new AppError('VALIDATION_FAILED', 422, { 'patch.contract_id': 'immutable' });
  checkOwnerEcho(p.owner_user_id, o.ownerUserId);
  const money = p.items !== undefined || p.header_discount !== undefined || p.deposit_amount !== undefined || p.shipping !== undefined;
  // Đơn sàn: sàn là nguồn sự thật (D31) — chỉ người phụ trách / ghi chú / trường tuỳ biến.
  if (o.lockedLines && money) throw new AppError('INVALID_STATE', 409, { order_id: 'locked_lines' });
  // Đang xử lý mà đã thu tiền → huỷ rồi tạo lại (COMMERCE §4).
  if (o.status === 'processing' && o.paidTotal > 0n && money) throw new AppError('INVALID_STATE', 409, { order_id: 'paid' });
  await checkAssignee(ctx, members, p.assigned_user_id);
  await checkOrderCustom(ctx, tx, members, p.custom, 'update');
  const header0 = (o.headerDiscount as Discount | null) ?? null;
  const items0 = await itemsOf(tx, o.id);
  const lines = p.items ? (await resolveLines(tx, p.items)).lines : null;
  const linesChanged = !!lines || p.header_discount !== undefined;
  const header = p.header_discount !== undefined ? p.header_discount : header0;
  const t = totalsOf(lines ?? items0, header);
  const cols = totalCols(t);
  const deposit = p.deposit_amount !== undefined ? BigInt(p.deposit_amount) : o.depositAmount;
  if (deposit > cols.total) throw new AppError('VALIDATION_FAILED', 422, { 'patch.deposit_amount': 'over_total' });

  const fields: string[] = [];
  const before: OrderReceipt['before'] = {};
  const touch = (field: string, prev: Partial<OrderReceipt['before']>) => {
    fields.push(field);
    Object.assign(before, prev);
  };
  if (linesChanged) touch('lines', { items: items0, header: header0 });
  if (p.assigned_user_id !== undefined && p.assigned_user_id !== o.assignedUserId) touch('assigned', { assigned: o.assignedUserId });
  if (p.note !== undefined && p.note.trim() !== o.note) touch('note', { note: o.note });
  if (p.deposit_amount !== undefined && deposit !== o.depositAmount) touch('deposit', { deposit: String(o.depositAmount) });
  const ship0 = shippingOf(o);
  if (p.shipping !== undefined) touch('shipping', { shipping: pick(ship0, Object.keys(p.shipping)) as Partial<Shipping> });
  const custom0 = (o.custom ?? {}) as CustomValues;
  if (p.custom !== undefined) touch('custom', { custom: pick(custom0, Object.keys(p.custom)) as CustomValues });

  if (lines) {
    await writeItems(tx, o.id, lines, t, now);
    if (o.status === 'processing' && o.stockRef) {
      await returnStock(tx, o, actorOf(ctx), now);
      await deductStock(tx, o, actorOf(ctx), now);
    }
  }
  await tx.order.update({
    where: { id: o.id },
    data: {
      ...cols,
      ...(p.header_discount !== undefined ? { headerDiscount: p.header_discount ? (p.header_discount as object) : TenantSql.DbNull } : {}),
      ...(p.assigned_user_id !== undefined ? { assignedUserId: p.assigned_user_id } : {}),
      ...(p.note !== undefined ? { note: p.note.trim() } : {}),
      ...(p.shipping !== undefined ? { shipping: { ...ship0, ...p.shipping } } : {}),
      ...(p.custom !== undefined ? { custom: mergeCustomValues(custom0, p.custom) as object } : {}),
      depositRequired: deposit > 0n,
      depositAmount: deposit,
      ...payCols({ ...o, total: cols.total, depositRequired: deposit > 0n, depositAmount: deposit }),
      updatedAt: now,
    },
  });
  const version = await orderVersion(tx, o.id);
  const receipt: OrderReceipt = { schema_version: 2, op: 'order.update', id: o.id, fields, before, after_version: version, event: null };
  return { result: { order_id: o.id, version }, before: receipt };
}

export async function setOrderDeposit(ctx: ActionContext, tx: TenantTx, input: ActionInput<typeof orderSetDeposit>, now: Date) {
  const o = await lockOrderVersion(tx, ctx.authz, input.order_id, input.if_version);
  assertTransition(ORDER_FLOW, o.status, 'order.set_deposit');
  if (o.lockedLines) throw new AppError('INVALID_STATE', 409, { order_id: 'locked_lines' });
  const deposit = BigInt(input.deposit_amount);
  if (deposit > o.total) throw new AppError('VALIDATION_FAILED', 422, { deposit_amount: 'over_total' });
  const event = await logEvent(tx, o.id, 'deposit_set', actorOf(ctx), now, { amount: deposit });
  const pay = payCols({ ...o, depositRequired: deposit > 0n, depositAmount: deposit });
  await tx.order.update({ where: { id: o.id }, data: { depositRequired: deposit > 0n, depositAmount: deposit, ...pay, updatedAt: now } });
  const version = await orderVersion(tx, o.id);
  const receipt: OrderReceipt = { schema_version: 2, op: 'order.set_deposit', id: o.id, fields: ['deposit'], before: { deposit: String(o.depositAmount) }, after_version: version, event };
  return { result: { order_id: o.id, pay_status: pay.payStatus, version }, before: receipt };
}

export async function updateOrderShipping(ctx: ActionContext, tx: TenantTx, input: ActionInput<typeof orderUpdateShipping>, now: Date) {
  const o = await lockOrderVersion(tx, ctx.authz, input.order_id, input.if_version);
  // Mã vận đơn có thể về sau khi hoàn tất → ngoài bảng ORDER_FLOW (completed là trạng thái cuối).
  if (!SHIPPING_EDITABLE.includes(o.status)) throw new AppError('INVALID_TRANSITION', 409, { status: o.status });
  const ship0 = shippingOf(o);
  const s = Object.fromEntries(Object.entries(input.shipping).map(([k, v]) => [k, String(v ?? '').trim()]));
  const event = await logEvent(tx, o.id, 'shipping', actorOf(ctx), now);
  await tx.order.update({ where: { id: o.id }, data: { shipping: { ...ship0, ...s }, updatedAt: now } });
  const version = await orderVersion(tx, o.id);
  const receipt: OrderReceipt = { schema_version: 2, op: 'order.update_shipping', id: o.id, fields: ['shipping'], before: { shipping: pick(ship0, Object.keys(s)) as Partial<Shipping> }, after_version: version, event };
  return { result: { order_id: o.id, version }, before: receipt };
}
