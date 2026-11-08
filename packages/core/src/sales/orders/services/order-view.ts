// Bản ghi đơn → dòng API (`orderRowSchema` — packages/shared/src/api/orders.ts). Tiền là string VND; tổng tính lại từ dòng (đơn sàn giữ
// tổng sàn). Nhật ký từ `order_event` (người làm → tên; hệ thống giữ `system` để FE dịch). Gợi ý cột AI là luật theo 2 trục (không gọi
// LLM — chữ theo locale người xem).
import { createFmt, interpolate, quoteTotals, serverMessages, type CustomValues, type Discount, type OrderRow } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import type { LineIn } from '../../quotes/services/quote-write';
import type { OrderRecord } from '../order-access';
import { EMPTY_SHIPPING, type Shipping } from './order-write';

export interface ViewCtx {
  locale: string;
  timeZone: string;
  now: Date;
  names: Map<string, string>;
}

type Contact = { id: string; name: string; phone: string | null };
type Ev = { type: string; actorType: string; actorId: string | null; amount: bigint | null; points: number | null; reason: string | null; createdAt: Date };

function hintOf(o: OrderRecord, ctx: ViewCtx): { hint: string; wait: boolean } {
  const m = serverMessages(ctx.locale).sales.order;
  const h = m.hint;
  const fmt = createFmt(ctx);
  const due = o.total - o.paidTotal;
  if (o.status === 'cancelled') return o.refundPending ? { hint: interpolate(h.refund, { amount: fmt.money(String(o.paidTotal - o.refundedTotal)) }), wait: true } : { hint: h.cancelled, wait: false };
  if (o.source === 'marketplace' && o.status !== 'completed') return { hint: interpolate(h.marketplace, { platform: (m.platform as Record<string, string>)[o.platform ?? ''] ?? o.platform ?? '' }), wait: false };
  if (o.status === 'completed') return { hint: h.done, wait: false };
  if (o.payStatus === 'awaiting_deposit') return { hint: interpolate(h.awaitingDeposit, { amount: fmt.money(String(o.depositAmount)) }), wait: true };
  if (o.status === 'new') return { hint: h.confirm, wait: false };
  if (due > 0n) return { hint: interpolate(h.collect, { amount: fmt.money(String(due)) }), wait: true };
  const ship = o.shipping as Partial<Shipping>;
  return ship.tracking ? { hint: h.complete, wait: false } : { hint: h.ship, wait: false };
}

export async function itemsByOrder(tx: TenantTx, ids: string[]): Promise<Map<string, LineIn[]>> {
  const rows = ids.length ? await tx.orderItem.findMany({ where: { orderId: { in: ids } }, orderBy: [{ orderId: 'asc' }, { sort: 'asc' }] }) : [];
  const out = new Map<string, LineIn[]>();
  for (const r of rows) {
    const list = out.get(r.orderId) ?? [];
    list.push({
      ...(r.productId ? { product_id: r.productId } : {}),
      name: r.name,
      variant: r.variant,
      qty: Number(r.qty),
      unit_price: String(r.unitPrice),
      tax_rate: r.taxRate,
      discount: (r.discount as Discount | null) ?? null,
    });
    out.set(r.orderId, list);
  }
  return out;
}

export async function eventsByOrder(tx: TenantTx, ids: string[]): Promise<Map<string, Ev[]>> {
  const rows = ids.length ? await tx.orderEvent.findMany({ where: { orderId: { in: ids } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }) : [];
  const out = new Map<string, Ev[]>();
  for (const r of rows) out.set(r.orderId, [...(out.get(r.orderId) ?? []), r]);
  return out;
}

export async function contactsOf(tx: TenantTx, ids: string[]): Promise<Map<string, Contact>> {
  const rows = ids.length ? await tx.contact.findMany({ where: { id: { in: [...new Set(ids)] } }, select: { id: true, name: true, phone: true } }) : [];
  return new Map(rows.map((c) => [c.id, c]));
}

/** Mã báo giá / hợp đồng nguồn của nhiều đơn. */
export async function sourceCodes(tx: TenantTx, rows: OrderRecord[]) {
  const qIds = [...new Set(rows.map((r) => r.quoteId).filter((x): x is string => !!x))];
  const cIds = [...new Set(rows.map((r) => r.contractId).filter((x): x is string => !!x))];
  const [qs, cs] = await Promise.all([
    qIds.length ? tx.quote.findMany({ where: { id: { in: qIds } }, select: { id: true, code: true } }) : [],
    cIds.length ? tx.contract.findMany({ where: { id: { in: cIds } }, select: { id: true, code: true } }) : [],
  ]);
  return new Map([...qs, ...cs].map((x) => [x.id, x.code]));
}

export const actorIds = (evs: Iterable<Ev[]>) => [...evs].flat().filter((e) => e.actorType !== 'system' && e.actorId).map((e) => e.actorId);

export function toOrderRow(o: OrderRecord, x: { items: LineIn[]; contact: Contact | undefined; events: Ev[]; codes: Map<string, string> }, ctx: ViewCtx): OrderRow {
  const header = (o.headerDiscount as Discount | null) ?? null;
  // Đơn sàn: giữ tổng sàn (không tính lại thuế / giảm giá theo luật AppChat).
  const t = o.lockedLines
    ? { subtotal: String(o.subtotal), discount_total: String(o.discountTotal), tax_total: String(o.taxTotal), total: String(o.total) }
    : quoteTotals(x.items, header);
  return {
    id: o.id,
    code: o.code,
    source: o.source,
    channel: o.channel,
    external: o.source === 'marketplace' ? { platform: o.platform ?? '', external_id: o.externalId ?? '', platform_status: o.platformStatus ?? '' } : null,
    locked_lines: o.lockedLines,
    contact_id: o.contactId,
    contact_name: x.contact?.name ?? '',
    phone: x.contact?.phone ?? '',
    owner_user_id: o.ownerUserId ?? '',
    owner_name: (o.ownerUserId && ctx.names.get(o.ownerUserId)) || '',
    assigned_user_id: o.assignedUserId ?? '',
    assigned_name: (o.assignedUserId && ctx.names.get(o.assignedUserId)) || '',
    version: o.version,
    quote_id: o.quoteId,
    quote_code: (o.quoteId && x.codes.get(o.quoteId)) || '',
    contract_id: o.contractId,
    contract_code: (o.contractId && x.codes.get(o.contractId)) || '',
    status: o.status,
    pay_status: o.payStatus,
    deposit_required: o.depositRequired,
    deposit_amount: String(o.depositAmount),
    paid_total: String(o.paidTotal),
    refund_pending: o.refundPending,
    items: x.items,
    header_discount: header,
    subtotal: t.subtotal,
    discount_total: t.discount_total,
    tax_total: t.tax_total,
    total: t.total,
    created_at: o.createdAt.toISOString(),
    cancel_reason: o.cancelReason,
    points_earned: o.pointsEarned,
    shipping: { ...EMPTY_SHIPPING, ...(o.shipping as Partial<Shipping>) },
    note: o.note,
    events: x.events.map((e) => ({
      type: e.type,
      at: e.createdAt.toISOString(),
      actor: e.actorType === 'system' || !e.actorId ? 'system' : ctx.names.get(e.actorId) || 'system',
      ...(e.amount !== null ? { amount: String(e.amount) } : {}),
      ...(e.points !== null ? { points: e.points } : {}),
      ...(e.reason ? { reason: e.reason } : {}),
    })),
    ai: hintOf(o, ctx),
    custom: (o.custom ?? {}) as CustomValues,
  };
}
