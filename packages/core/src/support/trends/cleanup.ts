// Dọn cache quan sát tồn ticket (TIP-034d §2.6, §3.3) — dưới khoá control, từng lô ≤ 100 lần chụp / transaction.
// - Lần chụp: giữ hôm nay + 7 ngày trước theo múi giờ ghi ở MỖI lần chụp (cache kỹ thuật, không phải lưu trữ pháp lý). Đọc chọn theo
//   ngày nên dọn trễ / lỗi không làm lộ lần chụp hết hạn.
// - Tập đóng góp của kết quả action: giữ 30 ngày (ràng buộc nguồn cho lịch sử, DC-451) — quá hạn lịch sử hiện "không còn dữ liệu".
// - "Quên khách" (`eraseStockForTicket`): xoá mọi dòng quan sát của ticket có nguồn gốc đã bị fence + MỌI kết quả action có ticket đó góp
//   số (cả tập — số không còn chứng minh được thì không chiếu lại). Idempotent.
import { STOCK_METRIC_VERSION, previousLocalDate, utcToWall } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { lockStockControl } from './control';
import { fencedObservationSql } from './source-guard';
import { STOCK_RESULT_RETENTION_DAYS, STOCK_RETENTION_BATCH, STOCK_RETENTION_DAYS } from './types';

type Db = { $transaction<T>(fn: (tx: TenantTx) => Promise<T>): Promise<T> };

/** Ngày lịch sớm nhất còn giữ khi hôm nay là `today`. */
export function oldestKeptDate(today: string): string {
  let d = today;
  for (let i = 1; i < STOCK_RETENTION_DAYS; i++) d = previousLocalDate(d);
  return d;
}

/** Một lô dọn; trả số lần chụp đã xoá (người gọi lặp tới khi 0). Múi giờ khác hiện tại dọn theo ngày của chính nó tại `now`. */
export async function pruneStockBatch(db: Db, now: Date): Promise<{ batches: number; results: number }> {
  return db.$transaction(async (tx) => {
    if (!(await lockStockControl(tx))) return { batches: 0, results: 0 };
    const zones = await tx.$queryRaw<{ time_zone: string }[]>`SELECT DISTINCT time_zone FROM ticket_stock_batch`;
    let batches = 0;
    for (const { time_zone } of zones) {
      let floor: string;
      try {
        floor = oldestKeptDate(utcToWall(now, time_zone).date);
      } catch {
        // Múi giờ ghi trước đây không còn hợp lệ → mọi lần chụp của nó không bao giờ được chọn; dọn theo UTC.
        floor = oldestKeptDate(now.toISOString().slice(0, 10));
      }
      batches += Number(
        await tx.$executeRaw`
          DELETE FROM ticket_stock_batch WHERE id IN (
            SELECT id FROM ticket_stock_batch WHERE time_zone = ${time_zone} AND local_date < ${floor}::date ORDER BY local_date, id LIMIT ${STOCK_RETENTION_BATCH - batches})`,
      );
      if (batches >= STOCK_RETENTION_BATCH) break;
    }
    // Phiên bản số đo cũ không bao giờ được chọn — dọn luôn.
    batches += Number(await tx.$executeRaw`DELETE FROM ticket_stock_batch WHERE id IN (SELECT id FROM ticket_stock_batch WHERE metric_version <> ${STOCK_METRIC_VERSION} ORDER BY id LIMIT ${STOCK_RETENTION_BATCH})`);
    const cutoff = new Date(now.getTime() - STOCK_RESULT_RETENTION_DAYS * 86_400_000);
    const results = Number(
      await tx.$executeRaw`
        DELETE FROM ticket_stock_result_contribution WHERE candidate_id IN (
          SELECT DISTINCT candidate_id FROM (SELECT candidate_id FROM ticket_stock_result_contribution WHERE created_at < ${cutoff} ORDER BY created_at, candidate_id LIMIT ${STOCK_RETENTION_BATCH * 50}) x)`,
    );
    return { batches, results };
  });
}

/** "Quên khách": xoá dấu vết quan sát / kết quả của một ticket (giữ khoá control — sau khoá của privacy). */
export async function eraseStockForTicket(tx: TenantTx, ticketId: string): Promise<void> {
  await lockStockControl(tx);
  await tx.$executeRaw`DELETE FROM ticket_stock_observation o WHERE o.ticket_id = ${ticketId}::uuid AND ${fencedObservationSql('o')}`;
  await tx.$executeRaw`
    DELETE FROM ticket_stock_result_contribution WHERE candidate_id IN (SELECT candidate_id FROM ticket_stock_result_contribution WHERE ticket_id = ${ticketId}::uuid)`;
}
