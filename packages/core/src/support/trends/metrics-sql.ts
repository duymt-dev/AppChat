// SQL năm số tồn ticket (TIP-034d §1.1) — cùng nghĩa từng chữ với meta hiện có (`tickets-read.service.ts`) và vị từ tham chiếu
// `@appchat/shared` stock-metrics (test so khớp ở mốc hạn / +1ms / tạm dừng / đã đóng). Alias bảng ticket là `t`; `now` là MỘT mốc Clock
// tiêm vào cho cả truy vấn (không `now()` của SQL cho thời gian nghiệp vụ).
import { TenantSql as Prisma } from '@appchat/db';

/** Quá hạn TTR tại `now` — mốc chính xác (bằng hạn không quá hạn); đã đóng theo kết quả SLA lúc đóng. */
export const breachSql = (now: Date) =>
  Prisma.sql`((t.status <> 'closed' AND coalesce(t.paused_since, ${now}) > t.ttr_due_at) OR (t.status = 'closed' AND t.sla_result = 'breached'))`;

/** Năm cột đếm (alias đầu ra total / open / waiting / breach / closed) từ một tập có cột `status` + `breached`. */
export const countColumns = (alias: string) => {
  const a = Prisma.raw(alias);
  return Prisma.sql`count(*) AS total,
    count(*) FILTER (WHERE ${a}.status = 'open') AS open,
    count(*) FILTER (WHERE ${a}.status = 'waiting') AS waiting,
    count(*) FILTER (WHERE ${a}.breached) AS breach,
    count(*) FILTER (WHERE ${a}.status = 'closed') AS closed`;
};
