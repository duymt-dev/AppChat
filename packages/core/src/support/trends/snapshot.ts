// Chụp quan sát tồn ticket một lần mỗi ngày lịch (TIP-034d §2.3–2.5). Một transaction READ COMMITTED: khoá control → lấy Clock SAU khi có
// khoá → một câu INSERT … SELECT mới (thấy fence "Quên khách" đã commit) → completed_at. Header + mọi dòng + hoàn tất commit cùng lúc;
// lỗi / quá thời gian → không có lần chụp nào (thử lại ở lượt sau của CHÍNH ngày hiện tại, không bao giờ đóng dấu ngày hôm qua).
// Không nạp ticket vào Node; không khoá dòng ticket / khách / hội thoại.
import { STOCK_METRIC_VERSION, utcToWall } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';
import { breachSql } from './metrics-sql';
import { captureTimeouts, lockStockControl } from './control';
import { readableTicketSql, sourceContactSql } from './source-guard';
import type { CaptureOutcome } from './types';

type Db = { $transaction<T>(fn: (tx: TenantTx) => Promise<T>): Promise<T> };

/**
 * Chụp ngày hiện tại (theo `timeZone`) nếu chưa có. `now` gọi SAU khi có khoá control. Trùng worker → thấy lần chụp đã có (unique ngày)
 * và bỏ qua. Ticket hiện có, nguồn còn đọc được — tất cả ticket của workspace (không theo người xem; scope áp lúc đọc).
 */
export async function captureStock(db: Db, timeZone: string, now: () => Date): Promise<CaptureOutcome> {
  return db.$transaction(async (tx) => {
    await captureTimeouts(tx);
    if (!(await lockStockControl(tx))) return { status: 'skipped', localDate: utcToWall(now(), timeZone).date };
    const at = now();
    const localDate = utcToWall(at, timeZone).date;
    const [hit] = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM ticket_stock_batch WHERE time_zone = ${timeZone} AND local_date = ${localDate}::date AND metric_version = ${STOCK_METRIC_VERSION}`;
    if (hit) return { status: 'exists', batchId: hit.id, localDate };
    const id = uuidv7(at.getTime());
    await tx.$executeRaw`
      INSERT INTO ticket_stock_batch (id, time_zone, local_date, metric_version, observed_at, completed_at)
      VALUES (${id}::uuid, ${timeZone}, ${localDate}::date, ${STOCK_METRIC_VERSION}, ${at}, ${at})`;
    const rows = await tx.$executeRaw`
      INSERT INTO ticket_stock_observation (batch_id, ticket_id, status, breached, source_contact_id, source_conversation_id)
      SELECT ${id}::uuid, t.id, t.status, ${breachSql(at)}, ${sourceContactSql()}, t.conversation_id
      FROM ticket t WHERE ${readableTicketSql()}`;
    // Hoàn tất cùng transaction: người đọc chỉ thấy lần chụp khi đủ dòng (commit nguyên khối).
    await tx.$executeRaw`UPDATE ticket_stock_batch SET completed_at = greatest(observed_at, ${now()}) WHERE id = ${id}::uuid`;
    await tx.$executeRaw`UPDATE ticket_stock_control SET updated_at = ${at} WHERE id = 1`;
    return { status: 'captured', batchId: id, localDate, rows: Number(rows) };
  });
}
