// Liệu trình / gói buổi (COMMERCE §6, state-machine §8): đơn có dòng sản phẩm `package` đã xác nhận (processing / completed) VÀ thu đủ
// → mỗi dòng gói sinh một `customer_package` (số buổi = buổi của sản phẩm × số lượng, hạn = hôm sinh + `valid_days`). Gọi khi thu tiền
// và khi đơn được xác nhận (consumer `order.confirmed` — đơn thu đủ trước khi xác nhận). Idempotent theo (đơn, sản phẩm).
// Trừ buổi theo lịch hẹn: TIP-033 (`package_usage`). Quét hết hạn: `expireDuePackages`.
import type { TenantDb } from '@appchat/db';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { uuidv7 } from '../../../kernel/ids';
import { writeOutbox } from '../../../kernel/outbox/outbox';
import { writeTimeline } from '../../../crm/public';
import type { Actor } from '../../orders/services/order-write';

type Ev = { topic: string; payload: Record<string, unknown> };
type OrderLike = { id: string; code: string; contactId: string; status: string; payStatus: string; total: bigint; paidTotal: bigint };

const DAY = 86_400_000;
const BATCH = 200;

/** Sinh liệu trình cho đơn đủ điều kiện. Trả event `package.granted` cho từng gói mới. */
export async function grantPackages(tx: TenantTx, o: OrderLike, actor: Actor, now: Date): Promise<Ev[]> {
  if ((o.status !== 'processing' && o.status !== 'completed') || o.payStatus !== 'paid') return [];
  const items = await tx.orderItem.findMany({ where: { orderId: o.id, productId: { not: null } }, orderBy: { sort: 'asc' } });
  if (!items.length) return [];
  const products = await tx.product.findMany({ where: { id: { in: items.map((i) => i.productId!) }, type: 'package' }, select: { id: true, sessions: true, validDays: true } });
  const byId = new Map(products.map((p) => [p.id, p]));
  const events: Ev[] = [];
  for (const it of items) {
    const p = byId.get(it.productId!);
    if (!p?.sessions) continue;
    const exists = await tx.customerPackage.findUnique({ where: { orderId_productId: { orderId: o.id, productId: p.id } }, select: { id: true } });
    if (exists) continue;
    const id = uuidv7(now.getTime());
    const total = p.sessions * Math.max(1, Math.round(Number(it.qty)));
    const expiresAt = p.validDays ? new Date(now.getTime() + p.validDays * DAY) : null;
    await tx.customerPackage.create({ data: { id, contactId: o.contactId, productId: p.id, orderId: o.id, name: it.name, totalSessions: total, expiresAt, createdAt: now, updatedAt: now } });
    await writeTimeline(tx, { contactId: o.contactId, type: 'payment', key: 'package_granted', params: { name: it.name, total, code: o.code }, actor, ref: { type: 'order', id: o.id }, at: now });
    events.push({ topic: 'package.granted', payload: { package_id: id, order_id: o.id, contact_id: o.contactId, total_sessions: total } });
  }
  return events;
}

/** Trạng thái sau khi đổi số buổi / hạn (gói đã hoàn tiền giữ nguyên). */
export function packageStatusOf(p: { status: string; totalSessions: number; usedSessions: number; expiresAt: Date | null }, now: Date) {
  if (p.status === 'refunded') return 'refunded' as const;
  if (p.usedSessions >= p.totalSessions) return 'exhausted' as const;
  if (p.expiresAt && p.expiresAt < now) return 'expired' as const;
  return 'active' as const;
}

/** Quét gói đang dùng đã quá hạn → expired (khoá). Trả số gói đã chuyển. */
export async function expireDuePackages(db: TenantDb, ws: string, now: Date): Promise<number> {
  const due = await db.customerPackage.findMany({ where: { status: 'active', expiresAt: { lt: now } }, select: { id: true }, take: BATCH });
  let n = 0;
  for (const { id } of due) {
    const done = await db.$transaction(async (tx) => {
      const r = await tx.customerPackage.updateMany({ where: { id, status: 'active', expiresAt: { lt: now } }, data: { status: 'expired', updatedAt: now } });
      if (r.count !== 1) return false;
      const p = (await tx.customerPackage.findUnique({ where: { id } }))!;
      await writeOutbox(tx, ws, [{ topic: 'package.expired', payload: { package_id: id, contact_id: p.contactId } }], now);
      return true;
    });
    if (done) n++;
  }
  return n;
}
