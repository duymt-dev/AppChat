// Báo giá mua / gia hạn / nâng / hạ gói + tài nguyên mua thêm (TIP-039, DC-242 / DC-243, COMMERCE §10) — server tính, client không gửi giá.
// Chụp kết quả vào `billing_invoice.snapshot` lúc tạo; ghi nhận khi đã trả dùng đúng ảnh chụp (fulfil.ts → lifecycle.service.ts).
//   new     — chưa có gói trả phí còn hạn (trial / Miễn phí / đã hết hạn): kỳ mới từ lúc trả, giá catalog.
//   renew   — cùng gói: nối tiếp ngày hết hạn hiện tại (kỳ sau), giá catalog.
//   switch  — gói rẻ hơn cùng kỳ (hạ gói): áp từ kỳ sau (pending), giá catalog của gói đích.
//   upgrade — gói đắt hơn: tiền = (giá kỳ đích − giá ĐÃ TRẢ) × phần kỳ còn lại; Credit = (hạn mức đích − nguồn) × phần THÁNG còn lại; giữ
//             ngày hết hạn. Gói năm dùng giá năm của gói đích (không có giá năm → không nâng giữa kỳ năm).
//   addon   — đồng hạn kỳ gói: (giá tháng × số tháng kỳ) × phần kỳ còn lại; không có gói trả phí → một tháng từ lúc trả, giá đủ.
import { AppError, catalogItem, monthAt, prorate, type PeriodAnchor } from '@appchat/shared';
import type { PlatformTx } from '../../kernel/actions/action-context';
import type {
  AddonSnapshot,
  InvoiceSnapshot,
  PlanRow,
  PlanSnapshot,
  UpgradeSnapshot,
} from '../lifecycle/types';

type Db = Pick<PlatformTx, 'plan' | 'subscription'>;
type Sub = NonNullable<Awaited<ReturnType<PlatformTx['subscription']['findUnique']>>>;

export interface Priced {
  kind: 'plan' | 'credits' | 'addon' | 'upgrade_proration';
  amount: bigint;
  credits: number | null;
  planId: string | null;
  months: number | null;
  snapshot: InvoiceSnapshot | Record<string, never>;
}

export const anchorFromSub = (s: Pick<Sub, 'anchorDay' | 'anchorHm' | 'anchorTz'>): PeriodAnchor | null =>
  s.anchorDay && s.anchorHm && s.anchorTz ? { day: s.anchorDay, hm: s.anchorHm, timeZone: s.anchorTz } : null;

/** Gói trả phí còn hạn tại `now` (status active, có kỳ đã trả chưa hết). */
export const paidActive = (s: Sub | null, now: Date): s is Sub =>
  !!s &&
  s.status === 'active' &&
  s.termPrice !== null &&
  s.termMonths !== null &&
  !!s.currentPeriodEnd &&
  s.currentPeriodEnd > now;

const notPurchasable = () => new AppError('VALIDATION_FAILED', 422, { item: 'not_purchasable' });
const termPrice = (p: PlanRow, months: number) =>
  months === 12 ? p.priceYear : months === 1 ? p.priceMonth : null;

export async function priceItem(
  tx: Db,
  workspaceId: string,
  i: { kind: 'plan' | 'credit' | 'addon'; item: string; period?: 'month' | 'year' },
  now: Date,
): Promise<Priced> {
  if (i.kind === 'credit') {
    const c = catalogItem('credit', i.item);
    if (!c) throw notPurchasable();
    return {
      kind: 'credits',
      amount: c.amount,
      credits: c.credits,
      planId: null,
      months: null,
      snapshot: {},
    };
  }
  const sub = await tx.subscription.findUnique({ where: { workspaceId } });
  if (i.kind === 'addon') return priceAddon(sub, i.item, now);
  const p = (await tx.plan.findUnique({ where: { key: i.item } })) as PlanRow | null;
  const months = i.period === 'year' ? 12 : 1;
  const price = p ? termPrice(p, months) : null;
  if (!p || !p.active || p.isTrialPlan || !price || price <= 0n) throw notPurchasable();
  if (!paidActive(sub, now)) return planPriced(p, months, price, { mode: 'new' });
  const cur = (await tx.plan.findUnique({ where: { id: sub.planId } })) as PlanRow | null;
  if (!cur) throw new AppError('INTERNAL', 500, undefined, 'Thiếu gói hiện tại');
  const starts = sub.currentPeriodEnd!.toISOString();
  if (cur.key === p.key)
    return planPriced(p, months, price, { mode: 'renew', starts_at: starts, sub_version: sub.version });
  // Cùng độ dài kỳ: so giá kỳ đích với giá kỳ ĐÃ TRẢ — đắt hơn = nâng (giữa kỳ), rẻ hơn / bằng = đổi từ kỳ sau.
  const target = termPrice(p, sub.termMonths!);
  if (!target) throw new AppError('VALIDATION_FAILED', 422, { period: 'no_matching_term' });
  if (target <= sub.termPrice!)
    return planPriced(p, months, price, { mode: 'switch', starts_at: starts, sub_version: sub.version });
  return upgrade(sub, cur, p, target, now);
}

function planPriced(
  p: PlanRow,
  months: number,
  price: bigint,
  x: Pick<PlanSnapshot, 'mode' | 'starts_at' | 'sub_version'>,
): Priced {
  const snapshot: PlanSnapshot = { v: 1, plan_key: p.key, months, price: String(price), ...x };
  return { kind: 'plan', amount: price, credits: null, planId: p.id, months, snapshot };
}

function upgrade(sub: Sub, cur: PlanRow, p: PlanRow, target: bigint, now: Date): Priced {
  const anchor = anchorFromSub(sub);
  if (!anchor) throw new AppError('CONFLICT', 409, { subscription: 'no_anchor' });
  const amount = prorate(target - sub.termPrice!, sub.currentPeriodStart, sub.currentPeriodEnd!, now);
  if (amount <= 0n) throw new AppError('VALIDATION_FAILED', 422, { item: 'nothing_to_charge' });
  const month = monthAt(now, anchor);
  const diff = (p.creditsMonth ?? 0n) - (cur.creditsMonth ?? 0n);
  const credits = diff > 0n ? prorate(diff, month.start, month.end, now) : 0n;
  const snapshot: UpgradeSnapshot = {
    v: 1,
    mode: 'upgrade',
    from_plan_key: cur.key,
    plan_key: p.key,
    sub_version: sub.version,
    term_start: sub.currentPeriodStart.toISOString(),
    term_end: sub.currentPeriodEnd!.toISOString(),
    target_term_price: String(target),
    credits: String(credits),
    month_start: month.start.toISOString(),
    month_end: month.end.toISOString(),
  };
  return {
    kind: 'upgrade_proration',
    amount,
    credits: Number(credits),
    planId: p.id,
    months: sub.termMonths,
    snapshot,
  };
}

function priceAddon(sub: Sub | null, item: string, now: Date): Priced {
  const c = catalogItem('addon', item);
  if (!c) throw notPurchasable();
  const resource = item === 'addon_channel' ? 'channels' : 'users';
  const base: Omit<AddonSnapshot, 'price' | 'ends_at'> = { v: 1, mode: 'addon', resource, quantity: 1 };
  if (!paidActive(sub, now))
    return {
      kind: 'addon',
      amount: c.amount,
      credits: null,
      planId: null,
      months: 1,
      snapshot: { ...base, price: String(c.amount), ends_at: null },
    };
  // Đồng hạn kỳ gói (DC-242): hết cùng ngày hết hạn gói; thu (giá tháng × số tháng của kỳ) × phần kỳ còn lại — kỳ tháng 01/04 → 01/05 mua
  // 16/04: 300.000đ → 150.000đ; gói năm tính trên cả kỳ năm.
  const end = sub.currentPeriodEnd!;
  const amount = prorate(c.amount * BigInt(sub.termMonths!), sub.currentPeriodStart, end, now);
  if (amount <= 0n) throw new AppError('VALIDATION_FAILED', 422, { item: 'nothing_to_charge' });
  return {
    kind: 'addon',
    amount,
    credits: null,
    planId: null,
    months: sub.termMonths,
    snapshot: { ...base, price: String(amount), ends_at: end.toISOString(), sub_version: sub.version },
  };
}
