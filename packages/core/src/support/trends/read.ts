// Đọc tồn ticket so với hôm qua (TIP-034d §1, §3.4, §4.1–4.2) — MỘT câu SQL, MỘT mốc Clock: tập hiện tại = ticket người xem thấy theo scope
// support (042c) + nguồn còn đọc được (fence "Quên khách"); mốc = MỘT lần quan sát hoàn tất của đúng ngày lịch hôm qua (múi giờ workspace
// hiện tại, cùng phiên bản số đo). Nối theo id ticket:
// - có dòng quan sát → góp trạng thái / quá hạn lúc đó;
// - không có dòng và tạo SAU lúc quan sát → góp 0 (ticket mới);
// - không có dòng mà tạo TRƯỚC / đúng lúc quan sát → không so được (không bao giờ giả định 0);
// - dòng quan sát có nguồn gốc nay đã bị fence → không so được (lý do chung, không nêu nguồn).
// Thiếu bảng (DB chậm một phiên bản) → số hiện tại vẫn có, so sánh `schema_unavailable`. Thiếu quyền → lỗi ở tầng gọi, không trả số trơn.
import { TenantSql as Prisma } from '@appchat/db';
import {
  STOCK_METRICS,
  STOCK_METRIC_VERSION,
  previousLocalDate,
  safeCount,
  utcToWall,
  type AuthzContext,
  type StockCounts,
  type TicketStockSummary,
} from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { supportScopeSql } from '../ticket-access';
import { breachSql } from './metrics-sql';
import { fencedObservationSql, readableTicketSql, sourceContactSql } from './source-guard';
import type { StockBaseline, StockComparison } from './types';

type Q = Pick<TenantTx, '$queryRaw'>;
export type CountRow = Record<string, bigint>;

const PRIOR = STOCK_METRICS.map((k) => `p_${k}`);

/** Bảng quan sát có ở DB tenant chưa (không ném — lỗi SQL trong transaction sẽ huỷ cả transaction đọc meta). */
export async function hasStockSchema(tx: Q): Promise<boolean> {
  const [r] = await tx.$queryRaw<{ ok: boolean }[]>`SELECT to_regclass('ticket_stock_result_source') IS NOT NULL AS ok`;
  return !!r?.ok;
}

/** Lần quan sát hoàn tất của đúng ngày lịch trước `today` (cùng múi giờ + phiên bản số đo) — không lùi sang ngày cũ hơn. */
export async function baselineOf(tx: Q, timeZone: string, today: string): Promise<StockBaseline | null> {
  const day = previousLocalDate(today);
  const [b] = await tx.$queryRaw<{ id: string; observed_at: Date }[]>`
    SELECT id, observed_at FROM ticket_stock_batch WHERE time_zone = ${timeZone} AND local_date = ${day}::date AND metric_version = ${STOCK_METRIC_VERSION}`;
  return b ? { id: b.id, observedAt: b.observed_at, localDate: day } : null;
}

/** Tập ticket hiện tại của người xem (alias đầu ra cur.*). */
export const cohortSql = (authz: AuthzContext, now: Date) =>
  Prisma.sql`SELECT t.id, t.version, t.status, t.created_at, ${sourceContactSql()} AS contact_id, t.conversation_id, ${breachSql(now)} AS breached
    FROM ticket t WHERE ${supportScopeSql(authz)} AND ${readableTicketSql()}`;

/**
 * Nối tập hiện tại với mốc (alias đầu ra j.*: matched / ps / pb / oc / ov / fenced). Không mốc → cột mốc rỗng. Dòng mốc có nguồn gốc đã
 * bị fence → KHÔNG trả id nguồn gốc (oc / ov null) để kết quả đóng băng không tái tạo dấu vết của khách đã quên sau lúc kiểm kê.
 */
export const joinBaselineSql = (base: StockBaseline | null) =>
  base
    ? Prisma.sql`SELECT b.*, CASE WHEN b.fenced THEN NULL ELSE b.oc0 END AS oc, CASE WHEN b.fenced THEN NULL ELSE b.ov0 END AS ov FROM (
        SELECT cur.*, o.ticket_id IS NOT NULL AS matched, o.status AS ps, o.breached AS pb, o.source_contact_id AS oc0,
          o.source_conversation_id AS ov0, (o.ticket_id IS NOT NULL AND ${fencedObservationSql('o')}) AS fenced
        FROM cur LEFT JOIN ticket_stock_observation o ON o.batch_id = ${base.id}::uuid AND o.ticket_id = cur.id) b`
    : Prisma.sql`SELECT cur.*, false AS matched, NULL::ticket_status AS ps, NULL::boolean AS pb, NULL::uuid AS oc, NULL::uuid AS ov, false AS fenced FROM cur`;

/** Năm số hiện tại + năm số mốc + đếm thiếu / fence trên tập `x` (cột status, breached, matched, ps, pb, created_at, fenced). */
export const aggregateSql = (observedAt: Date) => Prisma.sql`count(*) AS total, count(*) FILTER (WHERE status = 'open') AS open,
  count(*) FILTER (WHERE status = 'waiting') AS waiting, count(*) FILTER (WHERE breached) AS breach, count(*) FILTER (WHERE status = 'closed') AS closed,
  count(*) FILTER (WHERE matched) AS p_total, count(*) FILTER (WHERE ps = 'open') AS p_open, count(*) FILTER (WHERE ps = 'waiting') AS p_waiting,
  count(*) FILTER (WHERE pb) AS p_breach, count(*) FILTER (WHERE ps = 'closed') AS p_closed,
  count(*) FILTER (WHERE NOT matched AND created_at <= ${observedAt}) AS missing, count(*) FILTER (WHERE fenced) AS fenced`;

export const pickCounts = (r: CountRow, keys: readonly string[] = STOCK_METRICS): StockCounts =>
  Object.fromEntries(STOCK_METRICS.map((k, i) => [k, safeCount(r[keys[i]!] ?? 0n)])) as StockCounts;

/** So sánh nội bộ từ một hàng đếm — thuần, test được. */
export function compareOf(r: CountRow, base: StockBaseline | null, withStock: boolean, now: Date): StockComparison {
  if (!withStock) return { status: 'unavailable', reason: 'schema_unavailable' };
  if (!base) return { status: 'unavailable', reason: 'baseline_missing' };
  // Đồng hồ lùi / mốc ở tương lai → không tin mốc.
  if (base.observedAt.getTime() > now.getTime()) return { status: 'unavailable', reason: 'capture_unavailable' };
  if (safeCount(r.fenced ?? 0n) > 0) return { status: 'unavailable', reason: 'source_unavailable' };
  if (safeCount(r.missing ?? 0n) > 0) return { status: 'unavailable', reason: 'capture_unavailable' };
  return { status: 'available', baseline: base, prior: pickCounts(r, PRIOR) };
}

/** Hàng đếm → DTO (giờ hiển thị theo múi giờ workspace kèm offset). */
export function toSummary(r: CountRow, c: StockComparison, timeZone: string, now: Date): TicketStockSummary {
  const counts = pickCounts(r);
  return {
    counts,
    measured_at: utcToWall(now, timeZone).iso,
    time_zone: timeZone,
    metric_version: STOCK_METRIC_VERSION,
    cohort: 'current_authorized_surviving',
    comparison:
      c.status === 'available'
        ? {
            status: 'available',
            observed_at: utcToWall(c.baseline.observedAt, timeZone).iso,
            local_date: c.baseline.localDate,
            prior: c.prior,
            delta: Object.fromEntries(STOCK_METRICS.map((k) => [k, counts[k] - c.prior[k]])) as StockCounts,
          }
        : { status: 'unavailable', reason: c.reason },
  };
}

/** MỘT câu đọc: tập hiện tại + mốc + đếm (export để test EXPLAIN đúng câu lệnh chạy thật). */
export const stockReadSql = (authz: AuthzContext, base: StockBaseline | null, now: Date) =>
  Prisma.sql`WITH cur AS MATERIALIZED (${cohortSql(authz, now)}), j AS (${joinBaselineSql(base)})
    SELECT ${aggregateSql(base?.observedAt ?? now)} FROM j`;

/** Tóm tắt tồn ticket của người xem tại `now` (trong transaction đọc của người gọi). */
export async function readStockSummary(tx: Q, authz: AuthzContext, timeZone: string, now: Date): Promise<TicketStockSummary> {
  const withStock = await hasStockSchema(tx);
  const base = withStock ? await baselineOf(tx, timeZone, utcToWall(now, timeZone).date) : null;
  const [r] = await tx.$queryRaw<CountRow[]>(stockReadSql(authz, base, now));
  return toSummary(r!, compareOf(r!, base, withStock, now), timeZone, now);
}
