// Hoàn tác sửa đơn theo trường (TIP-032c §3): kiểm quyền hiện tại (quyền action gốc + scope GHI hiện tại) → khoá khách gốc → đơn → biên nhận
// phải có `after_version` = phiên bản hiện tại (bản ghi sau bất kỳ, kể cả không liên quan → 409; so giá trị không đủ — ABA). Chỉ khôi phục
// đúng tập trường đã đổi, không bao giờ đụng người tạo; hoàn tác thành công tăng phiên bản (không quay về số cũ). Lịch sử đơn giữ nguyên —
// thêm sự kiện bù `edit_undone` (lý do = action gốc) thay vì xoá sự kiện gốc. Biên nhận cũ (ảnh chụp schema 1) → 409, không đoán.
import { TenantSql } from '@appchat/db';
import { AppError, ORDER_FLOW, SHIPPING_EDITABLE, allowedActions, can, type CustomValues, type Discount } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import type { ActionLogRow } from '../../../kernel/actions/handler';
import { actorOf, deductStock, logEvent, payCols, returnStock, totalCols, totalsOf, writeItems, EMPTY_SHIPPING, type Shipping } from '../services/order-write';
import type { OrderRecord } from '../order-access';
import type { OrderReceipt } from './order-edit';
import { assertReceiptFresh, lockOrderVersion } from './order-version';

function receiptOf(log: ActionLogRow, op: OrderReceipt['op']): OrderReceipt {
  const r = log.before as Partial<OrderReceipt> | null;
  if (!r || r.schema_version !== 2 || r.op !== op || typeof r.id !== 'string' || !Array.isArray(r.fields)) throw new AppError('CONFLICT', 409, { receipt: 'legacy' });
  return r as OrderReceipt;
}

/** Đơn còn ở trạng thái action gốc cho phép (theo ORDER_FLOW). */
const allowed = (status: OrderRecord['status'], action: string) => allowedActions(ORDER_FLOW, status).includes(action);

export async function undoOrderEdit(ctx: ActionContext, log: ActionLogRow, tx: TenantTx, op: OrderReceipt['op'], now: Date): Promise<void> {
  if (!can(ctx.authz, 'order.manage')) throw new AppError('FORBIDDEN', 403, { permission: 'order.manage' });
  const r = receiptOf(log, op);
  const o = await lockOrderVersion(tx, ctx.authz, r.id);
  assertReceiptFresh(o.version, r);
  const f = new Set(r.fields);
  const b = r.before;
  const data: Record<string, unknown> = { updatedAt: now };
  let total = o.total;
  let depositAmount = o.depositAmount;

  if (op === 'order.update_shipping' || (op === 'order.update' && f.has('shipping'))) {
    if (op === 'order.update_shipping' ? !SHIPPING_EDITABLE.includes(o.status) : !allowed(o.status, 'order.update')) throw new AppError('INVALID_TRANSITION', 409, { status: o.status });
    data.shipping = { ...EMPTY_SHIPPING, ...(o.shipping as Partial<Shipping>), ...b.shipping };
  }
  if (op === 'order.set_deposit' || op === 'order.update') {
    if (!allowed(o.status, op)) throw new AppError('INVALID_TRANSITION', 409, { status: o.status });
  }
  if (op === 'order.update' && f.has('lines')) {
    if (o.lockedLines) throw new AppError('INVALID_STATE', 409, { order_id: 'locked_lines' });
    if (o.paidTotal > 0n) throw new AppError('INVALID_STATE', 409, { order_id: 'paid' });
    // Dòng khôi phục đúng ảnh chụp dòng đã lưu (giá / thuế / liệu trình lúc đó) — không định giá lại theo danh mục hiện tại.
    const items = b.items ?? [];
    const header = (b.header ?? null) as Discount | null;
    const t = totalsOf(items, header);
    const cols = totalCols(t);
    await writeItems(tx, o.id, items, t, now);
    if (o.status === 'processing' && o.stockRef) {
      await returnStock(tx, o, actorOf(ctx), now);
      await deductStock(tx, o, actorOf(ctx), now);
    }
    Object.assign(data, cols, { headerDiscount: header ? (header as object) : TenantSql.DbNull });
    total = cols.total;
  }
  if (f.has('deposit')) depositAmount = BigInt(b.deposit ?? '0');
  if (depositAmount > total) throw new AppError('CONFLICT', 409, { deposit_amount: 'over_total' });
  if (f.has('deposit') || f.has('lines')) Object.assign(data, { depositRequired: depositAmount > 0n, depositAmount, ...payCols({ ...o, total, depositRequired: depositAmount > 0n, depositAmount }) });
  if (f.has('assigned')) data.assignedUserId = b.assigned ?? null;
  if (f.has('note')) data.note = b.note ?? '';
  if (f.has('custom')) {
    const cur = { ...((o.custom ?? {}) as CustomValues) };
    for (const [k, v] of Object.entries(b.custom ?? {})) {
      if (v === null || v === undefined) delete cur[k];
      else cur[k] = v;
    }
    data.custom = cur as object;
  }
  await tx.order.update({ where: { id: o.id }, data });
  await logEvent(tx, o.id, 'edit_undone', actorOf(ctx), now, { reason: op });
}
