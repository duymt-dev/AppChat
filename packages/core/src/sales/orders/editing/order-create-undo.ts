// Hoàn tác tạo đơn (TIP-032c §3.6–3.7): KHÔNG xoá dòng — huỷ giữ lịch sử qua `cancelOrder` chuẩn, chỉ khi đơn còn nguyên trạng: `new`,
// chưa thu / chưa trừ kho / chưa có đề nghị thanh toán / khoản thu / liệu trình, không có bản ghi nào sau khi tạo (`after_version`). Cần quyền
// hoàn tác gốc + quyền `order.cancel` hiện tại + scope GHI hiện tại. Liên kết báo giá / hợp đồng nguồn và nhật ký giữ nguyên (đơn đã huỷ
// vẫn chiếm báo giá — không thành lần chuyển đổi thứ hai). Giai đoạn khách không bị hạ. Có dấu vết phụ thuộc → 409, dùng huỷ đơn thường.
import { AppError, can } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import type { ActionLogRow } from '../../../kernel/actions/handler';
import { actorOf } from '../services/order-write';
import { cancelOrder } from '../actions/order-flow.handlers';
import { writeOutbox } from '../../../kernel/outbox/outbox';
import { assertReceiptFresh, lockOrderVersion } from './order-version';

/** `after` của action tạo đơn: id + phiên bản cuối sau toàn bộ đường tạo. */
export const createdReceipt = (id: string, version: number) => ({ id, after_version: version });

const REASON = 'undo_create';

export async function undoOrderCreate(ctx: ActionContext, log: ActionLogRow, tx: TenantTx, now: Date) {
  if (!can(ctx.authz, 'order.manage')) throw new AppError('FORBIDDEN', 403, { permission: 'order.manage' });
  if (!can(ctx.authz, 'order.cancel')) throw new AppError('FORBIDDEN', 403, { permission: 'order.cancel' });
  const a = log.after as { id?: string; after_version?: unknown } | null;
  if (!a?.id) throw new AppError('CONFLICT', 409, { receipt: 'legacy' });
  const o = await lockOrderVersion(tx, ctx.authz, a.id);
  assertReceiptFresh(o.version, a);
  if (o.status !== 'new' || o.paidTotal > 0n || o.refundedTotal > 0n || o.stockRef || o.pointsUsed > 0n) throw new AppError('CONFLICT', 409, { order_id: 'not_pristine' });
  const [invoices, payments, packages] = await Promise.all([
    tx.invoice.count({ where: { orderId: o.id } }),
    tx.customerPayment.count({ where: { orderId: o.id } }),
    tx.customerPackage.count({ where: { orderId: o.id } }),
  ]);
  if (invoices || payments || packages) throw new AppError('CONFLICT', 409, { order_id: 'has_dependencies' });
  const contact = await tx.contact.findUnique({ where: { id: o.contactId }, select: { deletedAt: true } });
  if (!contact || contact.deletedAt) throw new AppError('CONFLICT', 409, { contact_id: 'gone' });
  const r = await cancelOrder(tx, o, REASON, actorOf(ctx), now);
  await writeOutbox(tx, ctx.workspaceId, r.events, now);
}
