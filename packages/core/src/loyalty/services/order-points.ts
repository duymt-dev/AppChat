// Điểm của đơn (TIP-036, COMMERCE §7, DC-186, DC-297). Hoàn tất: căn cứ snapshot (cấu hình bật / hệ số hạng / đơn sàn + thực thu lúc
// hoàn tất — DC-297 c) ghi trên đơn + event `order.completed`; consumer gọi `loyalty.earn` cộng đúng một lần mỗi lượt hoàn tất
// (`dedupe_key = earn:<completion_id>` — hoàn tác rồi hoàn tất lại là lượt mới). Đảo: hoàn tác hoàn tất / huỷ → đảo phần còn lại; hoàn tiền
// đã duyệt → theo tỉ lệ luỹ kế (reversalDelta). Đảo lấy trước từ lô của chính lần tích, thiếu → nợ (DC-297 a). Người gọi đã khoá dòng đơn
// trước dòng khách (thứ tự khoá chung: đề nghị → đơn → khách → lô).
import { REDEEM_VND_PER_POINT, earnBase, earnPoints, reversalDelta, safePoints, type LoyaltyTier } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { writeTimeline } from '../../crm/public';
import { lockMember } from '../repos/ledger.repo';
import { post, type Actor, type Posted } from './ledger.service';
import { readConfig } from './config.service';

type Ev = { topic: string; payload: Record<string, unknown> };
type OrderLike = { id: string; contactId: string; source: string; subtotal: bigint; discountTotal: bigint; pointsUsed: bigint; total: bigint; paidTotal: bigint; refundedTotal: bigint };

export interface EarnBasis {
  net_before_vat: string;
  earn_net: string;
  paid: string;
  due: string;
  refunded: string;
  base: number;
  tier: string;
  mult: number;
  config_version: number;
  enabled: boolean;
}

/** Net trước VAT đã trừ phần trả bằng điểm (COMMERCE §7 — 1 điểm = 100đ). */
export const netBeforeVat = (o: Pick<OrderLike, 'subtotal' | 'discountTotal' | 'pointsUsed'>) => {
  const v = o.subtotal - o.discountTotal - o.pointsUsed * REDEEM_VND_PER_POINT;
  return v > 0n ? v : 0n;
};

/** Đơn có tích điểm: chương trình bật; đơn sàn chỉ khi cấu hình loyalty bật `marketplace_earn` (§4b — cấu hình là nguồn quyết định). */
const earnsOf = (o: Pick<OrderLike, 'source'>, conf: { enabled: boolean; marketplaceEarn: boolean }) => conf.enabled && (o.source !== 'marketplace' || conf.marketplaceEarn);

/** Căn cứ + điểm của lượt hoàn tất (dùng chung hoàn tất thật, đồng bộ sàn và preview). */
export async function earnSnapshot(tx: TenantTx, o: OrderLike): Promise<{ points: number; net: bigint; basis: EarnBasis }> {
  const conf = await readConfig(tx);
  const c = await tx.contact.findUnique({ where: { id: o.contactId }, select: { tierKey: true } });
  const net = netBeforeVat(o);
  const b = earnBase({ net, total: o.total, paidTotal: o.paidTotal, refundedTotal: o.refundedTotal, pointsUsed: o.pointsUsed });
  const on = earnsOf(o, conf);
  const tier = c?.tierKey ?? 'member';
  const e = earnPoints(on ? b.net : 0n, tier, conf.tiers as LoyaltyTier[]);
  const basis: EarnBasis = { net_before_vat: String(net), earn_net: String(on ? b.net : 0n), paid: String(b.paid), due: String(b.due), refunded: String(o.refundedTotal), base: e.base, tier, mult: e.mult, config_version: conf.version, enabled: on };
  return { points: e.points, net, basis };
}

type EarnRow = NonNullable<Awaited<ReturnType<TenantTx['loyaltyLedger']['findFirst']>>>;

/** Bút toán tích còn hiệu lực của đơn (lượt chưa đảo hết) + số đã đảo của nó. */
export async function activeEarn(tx: TenantTx, orderId: string): Promise<{ earn: EarnRow; reversed: bigint } | null> {
  const earn = await tx.loyaltyLedger.findFirst({ where: { refType: 'order', refId: orderId, kind: 'earn', reversedById: null }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
  if (!earn) return null;
  const rev = await tx.loyaltyLedger.aggregate({ where: { refType: 'order', refId: orderId, kind: 'reverse', dedupeKey: { startsWith: `reverse:${earn.id}:` } }, _sum: { delta: true } });
  return { earn, reversed: -(rev._sum.delta ?? 0n) };
}

export interface ReverseIn {
  ws?: string;
  order: { id: string; code: string; contactId: string };
  earn: EarnRow;
  reversed: bigint;
  points: bigint;
  /** Hậu tố khoá chống lặp (`reverse:<earn>:<tag>`). */
  tag: string;
  balance: bigint;
  actor: Actor;
  now: Date;
}

/** Đảo `points` điểm của lần tích (lấy trước từ lô của nó, thiếu → nợ). Đảo hết → đánh dấu lần tích đã đảo. */
export async function reverseEarn(tx: TenantTx, r: ReverseIn): Promise<{ posted: Posted; events: Ev[] } | null> {
  const left = r.earn.delta - r.reversed;
  const d = r.points > left ? left : r.points;
  if (d <= 0n) return null;
  const p = await post(tx, { contactId: r.order.contactId, kind: 'reverse', delta: -d, balance: r.balance, actor: r.actor, now: r.now, ref: { type: 'order', id: r.order.id }, dedupeKey: `reverse:${r.earn.id}:${r.tag}`, preferLot: r.earn.id, allowDebt: true });
  if (r.reversed + d >= r.earn.delta) await tx.loyaltyLedger.update({ where: { id: r.earn.id }, data: { reversedById: p.id } });
  if (p.duplicate) return { posted: p, events: [] };
  await writeTimeline(tx, { contactId: r.order.contactId, type: 'loyalty', key: 'loyalty_reverse', params: { points: String(d), code: r.order.code }, actor: r.actor, ref: { type: 'order', id: r.order.id }, at: r.now });
  return { posted: p, events: [pointsChanged(r.order.contactId, 'reverse', p)] };
}

/** Điểm đảo khi hoàn tiền đã duyệt: tỉ lệ luỹ kế (đã hoàn sau hoàn tất / thực thu lúc hoàn tất) trừ phần đã đảo. */
export function refundShare(earn: EarnRow, reversed: bigint, refundedTotal: bigint): bigint {
  const b = (earn.basis ?? {}) as { paid?: string; refunded?: string };
  const since = refundedTotal - BigInt(b.refunded ?? '0');
  return reversalDelta(earn.delta, since > 0n ? since : 0n, BigInt(b.paid ?? '0'), reversed);
}

/**
 * Hoàn tác hoàn tất (undo `order.complete`, cùng transaction, đơn đã khoá): đảo hết lượt `completionId` nếu đã cộng. Chưa cộng thì consumer
 * về sau thấy nhật ký hoàn tất đã gỡ → bỏ qua (không cộng). Trả event để người gọi ghi outbox.
 */
export async function reverseCompletion(tx: TenantTx, o: { id: string; code: string; contactId: string }, completionId: string, actor: Actor, now: Date): Promise<Ev[]> {
  const earn = await tx.loyaltyLedger.findFirst({ where: { dedupeKey: `earn:${completionId}` } });
  if (!earn || earn.reversedById) return [];
  const m = await lockMember(tx, o.contactId);
  if (!m) return [];
  const rev = await tx.loyaltyLedger.aggregate({ where: { refType: 'order', refId: o.id, kind: 'reverse', dedupeKey: { startsWith: `reverse:${earn.id}:` } }, _sum: { delta: true } });
  const reversed = -(rev._sum.delta ?? 0n);
  const r = await reverseEarn(tx, { order: o, earn, reversed, points: earn.delta - reversed, tag: 'undo', balance: m.points_balance, actor, now });
  return r?.events ?? [];
}

export const pointsChanged = (contactId: string, kind: string, p: Posted): Ev => ({
  topic: 'loyalty.points_changed',
  payload: { contact_id: contactId, kind, delta: safePoints(p.delta), balance_after: safePoints(p.balanceAfter), ledger_id: p.id },
});
