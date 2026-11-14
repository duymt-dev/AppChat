// Chọn mục tiêu (TIP-006b §2.1, §2.3): (a) INSERT…SELECT native trong MỘT câu lệnh (một snapshot MVCC — vd. tác vụ AI); (b) dàn trang
// từ cohort đọc ở DB khác (thành viên nền tảng) dưới thế hệ chọn đang thuê. Chỉ lưu kiểu + id + phiên bản — không payload / thân / email.
import type { TenantSql as Prisma } from '@appchat/db';
import type { TenantTx } from '../../actions/action-context';
import type { SelectionLease } from './store';
import type { FanoutTarget } from './types';

/**
 * `source` là câu SELECT trả đúng 3 cột (target_kind text, target_id uuid, captured_version text). Ordinal theo target_id (tất định).
 * Trả số mục đã chèn; chạy lại cùng thế hệ bỏ qua trùng.
 */
export async function insertSelected(tx: TenantTx, fanoutId: string, l: SelectionLease, source: Prisma.Sql): Promise<number> {
  return tx.$executeRaw`
    INSERT INTO event_fanout_item (fanout_id, generation, target_kind, target_id, captured_version, ordinal)
    SELECT ${fanoutId}::uuid, ${l.generation}, s.target_kind, s.target_id, s.captured_version, (row_number() OVER (ORDER BY s.target_id))::int
      FROM (${source}) AS s(target_kind, target_id, captured_version)
    ON CONFLICT (fanout_id, generation, target_kind, target_id) DO NOTHING`;
}

/** Dàn một trang mục tiêu đọc từ nguồn khác (đã sắp theo id); `offset` = số mục đã dàn trước (ordinal liên tục). Ghi cursor theo thuê. */
export async function stageTargets(tx: TenantTx, fanoutId: string, l: SelectionLease, targets: readonly FanoutTarget[], offset: number, cursor: string | null): Promise<boolean> {
  if (targets.length) {
    await tx.$executeRaw`
      INSERT INTO event_fanout_item (fanout_id, generation, target_kind, target_id, captured_version, ordinal)
      SELECT ${fanoutId}::uuid, ${l.generation}, k, i::uuid, v, o
        FROM unnest(${targets.map((t) => t.kind)}::text[], ${targets.map((t) => t.id)}::text[], ${targets.map((t) => t.version ?? '')}::text[],
                    ${targets.map((_, i) => offset + i + 1)}::int[]) AS t(k, i, v, o)
      ON CONFLICT (fanout_id, generation, target_kind, target_id) DO NOTHING`;
  }
  const n = await tx.$executeRaw`
    UPDATE event_fanout SET cursor = ${cursor}, updated_at = now(), lease_until = now() + interval '120 seconds'
     WHERE id = ${fanoutId}::uuid AND lease_token = ${l.token}::uuid AND lease_generation = ${l.leaseGeneration} AND selection_generation = ${l.generation}`;
  return n === 1;
}
