// Tổng quan Khách thân thiết (TIP-036, prototype L4426–4490, Blueprint §4.4 `/loyalty/overview`): số thật từ sổ điểm theo scope crm người
// xem — điểm phát hành (cộng: tích + điều chỉnh dương) / đã dùng (đổi điểm) / đã đổi quà (P2 — 0) trong tháng hiện tại (giờ workspace) so
// tháng trước; tỉ lệ quay lại = khách có ≥ 2 đơn hoàn tất / khách có đơn hoàn tất (12 tháng); doanh thu thành viên = tổng đơn hoàn tất của
// khách có điểm trong tháng. Churn (J05) là P2 → danh sách rỗng, màn hiện "Sắp có". Quy tắc = luật COMMERCE §7 theo cấu hình (hệ số) + các
// thưởng ngoài luật trạng thái "soon". Tệp chung không còn — tệp theo thành viên ở `/loyalty/members/:id/files`.
import { createFmt, interpolate, serverMessages, utcToWall, wallToUtc, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { crmScopeSql } from '../../crm/public';
import { readConfig } from './config.service';

type Row = [string, string, string, string];
type Rule = [string, string, string, string, string, string];

const SOON: Rule[] = [
  ['big_order', 'order_completed', 'big', 'big_order', 'm12', 'soon'],
  ['birthday', 'birthday', 'all', 'birthday', 'm1', 'soon'],
  ['signup', 'signup', 'all', 'signup', 'm6', 'soon'],
  ['referral', 'referral', 'all', 'referral', 'm12', 'soon'],
  ['rating', 'rating', 'five', 'rating', 'm6', 'soon'],
  ['package', 'package', 'all', 'package', 'm12', 'soon'],
];

/** Đầu tháng (giờ workspace) chứa `now` và tháng trước. */
function months(now: Date, tz: string) {
  const [y, m] = utcToWall(now, tz).date.split('-').map(Number) as [number, number];
  const day = (yy: number, mm: number) => {
    const d = new Date(Date.UTC(yy, mm - 1, 1));
    return wallToUtc(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`, '00:00', tz);
  };
  return { cur: day(y, m), prev: day(y, m - 1), next: day(y, m + 1) };
}

const pct = (cur: bigint, prev: bigint) => (prev > 0n ? Number(((cur - prev) * 1000n) / prev) / 10 : cur > 0n ? 100 : 0);

export async function loyaltyOverview(tx: TenantTx, authz: AuthzContext, now: Date, locale: string, timeZone: string) {
  const fmt = createFmt({ locale, timeZone });
  const m = serverMessages(locale).loyalty.overview;
  const scope = crmScopeSql(authz);
  const w = months(now, timeZone);
  const sums = await tx.$queryRaw<{ issued: bigint; used: bigint; issued_prev: bigint; used_prev: bigint }[]>`
    SELECT
      coalesce(sum(l.delta) FILTER (WHERE l.delta > 0 AND l.kind IN ('earn', 'adjust') AND l.created_at >= ${w.cur} AND l.created_at < ${w.next}), 0)::bigint AS issued,
      coalesce(sum(-l.delta) FILTER (WHERE l.kind = 'redeem' AND l.created_at >= ${w.cur} AND l.created_at < ${w.next}), 0)::bigint AS used,
      coalesce(sum(l.delta) FILTER (WHERE l.delta > 0 AND l.kind IN ('earn', 'adjust') AND l.created_at >= ${w.prev} AND l.created_at < ${w.cur}), 0)::bigint AS issued_prev,
      coalesce(sum(-l.delta) FILTER (WHERE l.kind = 'redeem' AND l.created_at >= ${w.prev} AND l.created_at < ${w.cur}), 0)::bigint AS used_prev
    FROM loyalty_ledger l JOIN contact c ON c.id = l.contact_id
    WHERE c.deleted_at IS NULL AND ${scope} AND l.created_at >= ${w.prev} AND l.created_at < ${w.next}`;
  const year = new Date(now.getTime() - 365 * 86_400_000);
  const ret = await tx.$queryRaw<{ buyers: bigint; repeat: bigint }[]>`
    SELECT count(*)::bigint AS buyers, count(*) FILTER (WHERE n >= 2)::bigint AS repeat FROM (
      SELECT o.contact_id, count(*) AS n FROM "order" o JOIN contact c ON c.id = o.contact_id
      WHERE o.status = 'completed' AND o.deleted_at IS NULL AND o.completed_at >= ${year} AND c.deleted_at IS NULL AND ${scope}
      GROUP BY o.contact_id) t`;
  const rev = await tx.$queryRaw<{ cur: bigint; prev: bigint }[]>`
    SELECT
      coalesce(sum(o.total) FILTER (WHERE o.completed_at >= ${w.cur} AND o.completed_at < ${w.next}), 0)::bigint AS cur,
      coalesce(sum(o.total) FILTER (WHERE o.completed_at >= ${w.prev} AND o.completed_at < ${w.cur}), 0)::bigint AS prev
    FROM "order" o JOIN contact c ON c.id = o.contact_id
    WHERE o.status = 'completed' AND o.deleted_at IS NULL AND o.completed_at >= ${w.prev} AND o.completed_at < ${w.next}
      AND c.deleted_at IS NULL AND ${scope} AND EXISTS (SELECT 1 FROM loyalty_ledger l WHERE l.contact_id = c.id)`;
  const s = sums[0]!;
  const r = ret[0]!;
  const v = rev[0]!;
  const trend = (n: number) => `${n >= 0 ? '+' : ''}${String(n).replace('.', locale === 'vi' ? ',' : '.')}%`;
  const ratio = r.buyers > 0n ? Number((r.repeat * 1000n) / r.buyers) / 10 : 0;
  const overview: Row[] = [
    ['issued', fmt.number(Number(s.issued)), 'pts', trend(pct(s.issued, s.issued_prev))],
    ['used', fmt.number(Number(s.used)), 'pts', trend(pct(s.used, s.used_prev))],
    ['redeemed', '0', 'pts', trend(0)],
    ['return', `${String(ratio).replace('.', locale === 'vi' ? ',' : '.')}%`, '', trend(0)],
    ['revenue', fmt.moneyShort(String(v.cur)), '', trend(pct(v.cur, v.prev))],
  ];
  const cfg = await readConfig(tx);
  const mult = cfg.tiers.filter((t) => t.mult !== 1).map((t) => interpolate(m.mult, { tier: serverMessages(locale).loyalty.tier[t.key as 'gold'] ?? String(t.key), m: String(t.mult).replace('.', ',') }));
  const rules: Rule[] = [
    ['earn', 'order_completed', 'all', interpolate(m.earn, { vnd: fmt.number(cfg.earnVndPerPoint) }), interpolate(m.months, { n: cfg.expiryMonths }), cfg.enabled ? 'on' : 'off'],
    ['tier_mult', 'order_completed', 'tier', mult.join(' · '), interpolate(m.months, { n: cfg.expiryMonths }), cfg.enabled ? 'on' : 'off'],
    ...SOON.map(([k, trig, cond, calc, exp, st]): Rule => [k, trig, cond, (m.calc as Record<string, string>)[calc] ?? calc, (m.exp as Record<string, string>)[exp] ?? exp, st]),
  ];
  return { now: now.toISOString(), overview, churn: [], rules, files: [] };
}

export type LoyaltyOverviewDto = Awaited<ReturnType<typeof loyaltyOverview>>;
