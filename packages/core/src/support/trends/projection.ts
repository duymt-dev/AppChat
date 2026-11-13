// Kết quả action `ticket.stock_summary` có tập đóng góp ĐÓNG BĂNG (TIP-034d §3.5, DC-451): MỘT câu lệnh (CTE ghi dữ liệu) vật chất hoá từng
// ticket góp số (phiên bản, trạng thái hiện tại + mốc) và khoá nguồn chuẩn hoá (khách / hội thoại hiện tại + gốc lúc quan sát), rồi tính
// năm số CHỈ từ tập vừa ghi — số và nguồn không thể lệch nhau. Giữ khoá control (cùng giao thức với "Quên khách"). Chiếu lại trong lịch sử
// (GenUI $ref) KHÔNG tính lại: chỉ trả số đã lưu khi mọi nguồn còn đọc được và mọi ticket góp số vẫn trong scope người xem.
import type { TenantDb } from '@appchat/db';
import { utcToWall, type AuthzContext, type TicketStockSummary } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';
import { supportScopeSql } from '../ticket-access';
import { lockStockControl } from './control';
import { aggregateSql, baselineOf, cohortSql, compareOf, hasStockSchema, joinBaselineSql, readStockSummary, toSummary, type CountRow } from './read';

export type StockResult = TicketStockSummary & { result_id: string | null };

/** Tóm tắt + id tập đóng góp. Bảng chưa có (DB chậm một phiên bản) → tóm tắt không mốc, không tập đóng góp (`result_id` null). */
export async function materializeStockResult(tx: TenantTx, authz: AuthzContext, timeZone: string, now: Date): Promise<StockResult> {
  if (!(await hasStockSchema(tx))) return { ...(await readStockSummary(tx, authz, timeZone, now)), result_id: null };
  await lockStockControl(tx);
  const base = await baselineOf(tx, timeZone, utcToWall(now, timeZone).date);
  const observedAt = base?.observedAt ?? now;
  const id = uuidv7(now.getTime());
  const [r] = await tx.$queryRaw<CountRow[]>`
    WITH cur AS MATERIALIZED (${cohortSql(authz, now)}),
    j AS MATERIALIZED (${joinBaselineSql(base)}),
    ins AS (
      INSERT INTO ticket_stock_result_contribution (candidate_id, ticket_id, ticket_version, current_status, current_breached, prior_status, prior_breached, missing_reason, provenance)
      SELECT ${id}::uuid, j.id, j.version, j.status, j.breached, j.ps, j.pb,
        CASE WHEN j.matched THEN NULL WHEN j.created_at > ${observedAt} THEN 'new_after_baseline' ELSE 'missing_before_baseline' END,
        jsonb_strip_nulls(jsonb_build_object('contact', j.contact_id, 'conversation', j.conversation_id, 'baseline_contact', j.oc, 'baseline_conversation', j.ov))
      FROM j
      RETURNING ticket_id, current_status AS status, current_breached AS breached, prior_status AS ps, prior_breached AS pb,
        prior_status IS NOT NULL AS matched, missing_reason
    ),
    src AS (
      INSERT INTO ticket_stock_result_source (candidate_id, ticket_id, source_kind, source_id, source_generation, origin)
      SELECT DISTINCT ${id}::uuid, s.id, s.kind, s.src, 0, s.origin FROM (
        SELECT j.id, 'contact' AS kind, j.contact_id AS src, 'current' AS origin FROM j WHERE j.contact_id IS NOT NULL
        UNION ALL SELECT j.id, 'conversation', j.conversation_id, 'current' FROM j WHERE j.conversation_id IS NOT NULL
        UNION ALL SELECT j.id, 'contact', j.oc, 'baseline' FROM j WHERE j.oc IS NOT NULL
        UNION ALL SELECT j.id, 'conversation', j.ov, 'baseline' FROM j WHERE j.ov IS NOT NULL
      ) s
      RETURNING 1
    ),
    x AS (SELECT ins.*, NULL::timestamptz AS created_at, false AS fenced FROM ins)
    SELECT ${aggregateSql(observedAt)},
      (SELECT count(*) FROM ins WHERE missing_reason = 'missing_before_baseline') AS missing_frozen,
      (SELECT count(*) FROM j WHERE j.fenced) AS fenced_frozen,
      (SELECT count(*) FROM src) AS sources
    FROM x`;
  // Thiếu / fence đếm từ tập đóng băng (cột created_at không có ở `ins` — lấy lý do đã ghi).
  const row: CountRow = { ...r!, missing: r!.missing_frozen ?? 0n, fenced: r!.fenced_frozen ?? 0n };
  return { ...toSummary(row, compareOf(row, base, true, now), timeZone, now), result_id: id };
}

/**
 * Lịch sử / GenUI $ref: còn chiếu lại được kết quả `resultId` cho người xem? Cần tập đóng góp còn đó, KHÔNG nguồn nào (hiện tại hay gốc)
 * đã bị "Quên khách", và mọi ticket góp số còn tồn tại vẫn trong scope support của người xem. Không chứng minh được → false.
 */
export async function stockResultReadable(db: Pick<TenantDb, '$queryRaw'>, authz: AuthzContext, resultId: string): Promise<boolean> {
  const [r] = await db.$queryRaw<{ n: bigint; fenced: boolean; outside: boolean }[]>`
    SELECT (SELECT count(*) FROM ticket_stock_result_contribution c WHERE c.candidate_id = ${resultId}::uuid) AS n,
      EXISTS (
        SELECT 1 FROM ticket_stock_result_source s
        WHERE s.candidate_id = ${resultId}::uuid AND (
          (s.source_kind = 'contact' AND EXISTS (SELECT 1 FROM privacy_family_member pm WHERE pm.contact_id = s.source_id))
          OR (s.source_kind = 'conversation' AND EXISTS (SELECT 1 FROM conversation fc JOIN privacy_family_member pm ON pm.contact_id = fc.contact_id WHERE fc.id = s.source_id)))
      ) AS fenced,
      EXISTS (
        SELECT 1 FROM ticket_stock_result_contribution c JOIN ticket t ON t.id = c.ticket_id
        WHERE c.candidate_id = ${resultId}::uuid AND (${supportScopeSql(authz)}) IS NOT TRUE
      ) AS outside`;
  return !!r && r.n > 0n && !r.fenced && !r.outside;
}
