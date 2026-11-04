// Liệu trình / gói buổi (COMMERCE §6, state-machine §8): đơn có dòng liệu trình đã xác nhận (processing / completed) VÀ thu đủ — hoặc đã
// cọc nếu sản phẩm cho dùng khi mới cọc (`grant_on_deposit`, TIP-032b) → mỗi dòng sinh một `customer_package` (số buổi = buổi × số lượng,
// hạn = hôm sinh + `valid_days`). Đọc ẢNH CHỤP trên dòng đơn (không tra danh mục hiện tại); dòng chưa có ảnh chụp (đơn cũ) đọc sản
// phẩm như trước. Gọi khi thu tiền và khi đơn được xác nhận (consumer `order.confirmed`). Idempotent theo dòng đơn (unique partial
// `order_item_id`); đơn đã có gói cũ theo (đơn, sản phẩm) — `legacy_product` — không sinh thêm cho sản phẩm đó (không chia / nhân gói).
// Trừ buổi theo lịch hẹn: TIP-033 (`package_usage`). Quét hết hạn: `expireDuePackages`. Nhắc gia hạn: `package-reminders.ts`.
import type { TenantDb } from '@appchat/db';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { uuidv7 } from '../../../kernel/ids';
import { writeOutbox } from '../../../kernel/outbox/outbox';
import { writeTimeline } from '../../../crm/public';
import type { Actor } from '../../orders/services/order-write';

type Ev = { topic: string; payload: Record<string, unknown> };
type OrderLike = { id: string; code: string; contactId: string; status: string; payStatus: string; total: bigint; paidTotal: bigint; depositRequired: boolean };

const DAY = 86_400_000;
const BATCH = 200;

type Line = { id: string; productId: string; name: string; qty: unknown; sessions: number | null; validDays: number | null; onDeposit: boolean };

/** Dòng liệu trình của đơn: ảnh chụp trên dòng; dòng chưa có ảnh chụp (đơn trước TIP-032b) đọc sản phẩm. */
async function packageLines(tx: TenantTx, orderId: string): Promise<Line[]> {
  const items = await tx.orderItem.findMany({ where: { orderId, productId: { not: null } }, orderBy: { sort: 'asc' } });
  const legacy = items.filter((i) => !i.snapshotAt).map((i) => i.productId!);
  const products = legacy.length ? await tx.product.findMany({ where: { id: { in: legacy }, type: 'package' }, select: { id: true, sessions: true, validDays: true } }) : [];
  const byId = new Map(products.map((p) => [p.id, p]));
  return items.flatMap((it): Line[] => {
    if (it.snapshotAt) return it.productType === 'package' ? [{ id: it.id, productId: it.productId!, name: it.name, qty: it.qty, sessions: it.packageSessions, validDays: it.packageValidDays, onDeposit: it.grantOnDeposit }] : [];
    const p = byId.get(it.productId!);
    return p ? [{ id: it.id, productId: p.id, name: it.name, qty: it.qty, sessions: p.sessions, validDays: p.validDays, onDeposit: false }] : [];
  });
}

/** Sinh liệu trình cho đơn đủ điều kiện (gọi trong transaction đã khoá đơn). Trả event `package.granted` cho từng gói mới. */
export async function grantPackages(tx: TenantTx, o: OrderLike, actor: Actor, now: Date): Promise<Ev[]> {
  if (o.status !== 'processing' && o.status !== 'completed') return [];
  const paid = o.payStatus === 'paid';
  // Đã cọc: đơn bật cọc thu đủ mức cọc (`deposited`); đơn không bật cọc đã thu một phần (`partial`). Hoàn tiền → không sinh thêm.
  const deposited = o.payStatus === 'deposited' || (o.payStatus === 'partial' && !o.depositRequired);
  if (!paid && !deposited) return [];
  const lines = (await packageLines(tx, o.id)).filter((l) => l.sessions && (paid || l.onDeposit));
  if (!lines.length) return [];
  const have = await tx.customerPackage.findMany({ where: { orderId: o.id }, select: { orderItemId: true, productId: true, sourceKind: true } });
  const items = new Set(have.map((h) => h.orderItemId));
  const legacy = new Set(have.filter((h) => h.sourceKind === 'legacy_product').map((h) => h.productId));
  const events: Ev[] = [];
  for (const l of lines) {
    if (items.has(l.id) || legacy.has(l.productId)) continue;
    const id = uuidv7(now.getTime());
    const total = l.sessions! * Math.max(1, Math.round(Number(l.qty)));
    const expiresAt = l.validDays ? new Date(now.getTime() + l.validDays * DAY) : null;
    // Hai yêu cầu đồng thời (webhook + xác nhận đơn) đã xếp hàng trên khoá đơn; ON CONFLICT là chốt chặn cuối theo unique partial.
    const r = await tx.$executeRaw`INSERT INTO customer_package (id, contact_id, product_id, order_id, name, total_sessions, expires_at, source_kind, order_item_id, created_at, updated_at)
      VALUES (${id}::uuid, ${o.contactId}::uuid, ${l.productId}::uuid, ${o.id}::uuid, ${l.name}, ${total}, ${expiresAt}, 'order_item', ${l.id}::uuid, ${now}, ${now})
      ON CONFLICT (order_item_id) WHERE order_item_id IS NOT NULL DO NOTHING`;
    if (!r) continue;
    await writeTimeline(tx, { contactId: o.contactId, type: 'payment', key: 'package_granted', params: { name: l.name, total, code: o.code }, actor, ref: { type: 'order', id: o.id }, at: now });
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
