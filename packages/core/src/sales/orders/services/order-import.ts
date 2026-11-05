// Nhập / cập nhật đơn sàn (D31, COMMERCE §4b, provider-ports "Đồng bộ đơn") — một transaction mỗi đơn. Idempotent theo (kết nối, mã
// ngoài): lần đầu tạo đơn `source = marketplace`, khoá dòng / giá / tổng (sàn là nguồn sự thật); lần sau chỉ cập nhật trạng thái sàn,
// vận chuyển, đã thu và đi tiếp theo ORDER_FLOW (không lùi trạng thái cuối). Khách khớp theo `contact_identity(marketplace, buyer_id)`
// — sàn che SĐT. Dòng khớp sản phẩm theo SKU (`product.code` / `product_variant.sku`) để trừ kho; không khớp vẫn nhập (không trừ kho).
import { nextState, ORDER_FLOW, serverMessages, interpolate } from '@appchat/shared';
import type { ExternalOrder, MappedStatus } from '@appchat/integrations';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { uuidv7 } from '../../../kernel/ids';
import { nextCode } from '../../../kernel/sequence';
import { ContactIdentityService, writeTimeline } from '../../../crm/public';
import type { OrderRecord } from '../order-access';
import { cancelOrder, completeOrder } from '../actions/order-flow.handlers';
import { orderPayload } from '../actions/order-create.handlers';
import { recordMarketplacePaid } from '../../payments/services/order-refund';
import { EMPTY_SHIPPING, deductStock, logEvent, moveOrder, payCols, writeItems, type Actor, type Shipping } from './order-write';

type Ev = { topic: string; payload: Record<string, unknown> };
export interface SyncConnection {
  id: string;
  createdBy: string | null;
}

const SYSTEM: Actor = { type: 'system', id: null };
const identities = new ContactIdentityService();

async function matchProducts(tx: TenantTx, skus: string[]) {
  const uniq = [...new Set(skus.filter(Boolean))];
  if (!uniq.length) return new Map<string, { productId: string; variantId: string | null }>();
  const [products, variants] = await Promise.all([
    tx.product.findMany({ where: { code: { in: uniq }, deletedAt: null }, select: { id: true, code: true } }),
    // Biến thể đã lưu trữ không nhận dòng mới (TIP-032b) — như ô chọn ở form đơn.
    tx.productVariant.findMany({ where: { sku: { in: uniq }, status: 'active' }, select: { id: true, sku: true, productId: true } }),
  ]);
  const out = new Map<string, { productId: string; variantId: string | null }>();
  for (const v of variants) out.set(v.sku, { productId: v.productId, variantId: v.id });
  for (const p of products) out.set(p.code, { productId: p.id, variantId: null });
  return out;
}

/** Đi tiếp theo trạng thái sàn: new → processing (trừ kho) → completed; new / processing → cancelled (hoàn kho). */
async function advance(tx: TenantTx, id: string, want: MappedStatus['status'], platformStatus: string, now: Date): Promise<Ev[]> {
  const events: Ev[] = [];
  for (let hop = 0; hop < 3; hop++) {
    const o = (await tx.order.findUnique({ where: { id } })) as OrderRecord;
    if (o.status === want) break;
    if (want === 'cancelled' && nextState(ORDER_FLOW, o.status, 'order.cancel')) {
      const m = serverMessages('vi').sales.order;
      const reason = interpolate(m.platformCancel, { status: platformStatus });
      events.push(...(await cancelOrder(tx, o, reason, SYSTEM, now)).events);
      break;
    }
    if (o.status === 'new' && (want === 'processing' || want === 'completed')) {
      await moveOrder(tx, o, 'processing', { confirmedAt: now }, now);
      await deductStock(tx, o, SYSTEM, now);
      await logEvent(tx, o.id, 'confirmed', SYSTEM, now);
      events.push({ topic: 'order.confirmed', payload: orderPayload(o) });
      continue;
    }
    if (o.status === 'processing' && want === 'completed') {
      events.push(...(await completeOrder(tx, o, SYSTEM, now)).events);
      continue;
    }
    break;
  }
  return events;
}

/** Ghi nhận đã thu theo sàn (khoản thu `marketplace` ở sổ thu — TIP-032; ở đây số đã thu + nhật ký). */
async function markPaid(tx: TenantTx, id: string, paid: boolean, now: Date) {
  const o = (await tx.order.findUnique({ where: { id } })) as OrderRecord;
  if (!paid || o.paidTotal >= o.total || o.status === 'cancelled') return;
  await tx.order.update({ where: { id }, data: { paidTotal: o.total, ...payCols({ ...o, paidTotal: o.total }), updatedAt: now } });
  await logEvent(tx, id, 'paid', SYSTEM, now, { amount: o.total - o.paidTotal });
  await recordMarketplacePaid(tx, o, o.total - o.paidTotal, now);
}

/** Nhập một đơn sàn. Trả `created` + event cho outbox (người gọi ghi cùng transaction). */
export async function importExternal(tx: TenantTx, conn: SyncConnection, ext: ExternalOrder, mapped: MappedStatus, now: Date): Promise<{ created: boolean; orderId: string; events: Ev[] }> {
  const key = { externalConnectionId_externalId: { externalConnectionId: conn.id, externalId: ext.external_id } };
  const ship = { carrier: ext.shipping?.carrier ?? '', tracking: ext.shipping?.tracking ?? '', eta: ext.shipping?.eta ?? '' };
  const found = await tx.order.findUnique({ where: key, select: { id: true, shipping: true, platformStatus: true } });
  if (found) {
    await tx.$queryRaw`SELECT 1 FROM "order" WHERE id = ${found.id}::uuid FOR UPDATE`;
    await tx.order.update({ where: { id: found.id }, data: { platformStatus: ext.platform_status, syncedAt: now, shipping: { ...EMPTY_SHIPPING, ...(found.shipping as Partial<Shipping>), ...ship }, updatedAt: now } });
    await markPaid(tx, found.id, mapped.paid, now);
    const moved = await advance(tx, found.id, mapped.status, ext.platform_status, now);
    const o = (await tx.order.findUnique({ where: { id: found.id } })) as OrderRecord;
    const changed = moved.length > 0 || found.platformStatus !== ext.platform_status;
    return { created: false, orderId: o.id, events: changed ? [{ topic: 'order.external_updated', payload: orderPayload(o) }, ...moved] : [] };
  }

  const { contactId, events: contactEvents } = await identities.resolve(
    tx,
    { channelType: 'marketplace', channelAccountId: conn.id, externalId: ext.buyer.id, displayName: ext.buyer.name || null, phone: ext.buyer.phone ?? null },
    now,
  );
  const contact = await tx.contact.findUniqueOrThrow({ where: { id: contactId }, select: { ownerUserId: true } });
  const matched = await matchProducts(tx, ext.lines.map((l) => l.sku));
  const lines = ext.lines.map((l) => ({ ...(matched.get(l.sku) ? { product_id: matched.get(l.sku)!.productId, variant_id: matched.get(l.sku)!.variantId } : {}), name: l.name, qty: l.qty, unit_price: l.unit_price, tax_rate: 0 as const }));
  const gross = lines.reduce((a, l) => a + BigInt(Math.round(l.qty * Number(l.unit_price))), 0n);
  const total = BigInt(ext.total);
  const id = uuidv7(now.getTime());
  const code = await nextCode(tx, 'order');
  await tx.order.create({
    data: {
      id,
      code,
      source: 'marketplace',
      channel: 'marketplace',
      externalConnectionId: conn.id,
      externalId: ext.external_id,
      platform: ext.platform,
      platformStatus: ext.platform_status,
      syncedAt: now,
      lockedLines: true,
      ownerUserId: contact.ownerUserId ?? conn.createdBy,
      contactId,
      subtotal: gross,
      lineDiscountTotal: gross > total ? gross - total : 0n,
      discountTotal: gross > total ? gross - total : 0n,
      total,
      shipping: { ...EMPTY_SHIPPING, ...ship },
      createdByType: 'system',
      createdAt: new Date(ext.created_at),
      updatedAt: now,
    },
  });
  // Dòng giữ đúng giá sàn (không tính lại thuế): line_total = qty × đơn giá.
  const nets = lines.map((l) => String(Math.round(l.qty * Number(l.unit_price))));
  await writeItems(tx, id, lines, { lines: nets.map((n) => ({ gross: n, net: n })) }, now);
  await logEvent(tx, id, 'imported', SYSTEM, now);
  const o = (await tx.order.findUnique({ where: { id } })) as OrderRecord;
  const m = serverMessages('vi').sales.order.platform as Record<string, string>;
  await writeTimeline(tx, { contactId, type: 'order', key: 'order_imported', params: { code, platform: m[ext.platform] ?? ext.platform, total: String(total) }, actor: SYSTEM, ref: { type: 'order', id }, at: now });
  await markPaid(tx, id, mapped.paid, now);
  const moved = await advance(tx, id, mapped.status, ext.platform_status, now);
  return { created: true, orderId: id, events: [...contactEvents, { topic: 'order.imported', payload: orderPayload(o) }, ...moved] };
}
