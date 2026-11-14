// Xử lý mục đã niêm phong theo trang (TIP-006b §2.1): trang ≤ 100 mục `pending` theo target_id (index page_idx); mỗi mục ghi kết cục
// CÙNG transaction hiệu ứng (điều kiện pending → chạy lại / hai worker không ghi đè); đếm đã xử lý tăng cùng lúc. Chỉ thế hệ đã niêm phong.
import type { TenantTx } from '../../actions/action-context';
import { FANOUT_PAGE, type FanoutItem, type ItemOutcome } from './types';

export async function pendingPage(tx: Pick<TenantTx, '$queryRaw'>, fanoutId: string, after: string | null, limit = FANOUT_PAGE): Promise<FanoutItem[]> {
  return tx.$queryRaw<FanoutItem[]>`
    SELECT i.target_kind AS kind, i.target_id::text AS id, i.captured_version AS version, i.ordinal
      FROM event_fanout f JOIN event_fanout_item i ON i.fanout_id = f.id AND i.generation = f.selection_generation
     WHERE f.id = ${fanoutId}::uuid AND f.selection_phase = 'sealed' AND i.phase = 'pending'
       AND (${after}::uuid IS NULL OR i.target_id > ${after}::uuid)
     ORDER BY i.target_id LIMIT ${limit}`;
}

/** Khoá một mục trước hiệu ứng (FOR UPDATE) — false nếu đã có kết cục (người khác xong trước) hoặc không thuộc thế hệ niêm phong. */
export async function lockItem(tx: TenantTx, fanoutId: string, kind: string, id: string): Promise<boolean> {
  const r = await tx.$queryRaw<{ phase: string }[]>`
    SELECT i.phase::text AS phase FROM event_fanout f JOIN event_fanout_item i ON i.fanout_id = f.id AND i.generation = f.selection_generation
     WHERE f.id = ${fanoutId}::uuid AND f.selection_phase = 'sealed' AND i.target_kind = ${kind} AND i.target_id = ${id}::uuid FOR UPDATE OF i`;
  return r[0]?.phase === 'pending';
}

/** Ghi kết cục mục (điều kiện pending) + tăng đếm — trong transaction hiệu ứng. */
export async function settleItem(tx: TenantTx, fanoutId: string, kind: string, id: string, o: ItemOutcome): Promise<boolean> {
  const n = await tx.$executeRaw`
    UPDATE event_fanout_item i SET phase = ${o.phase}::fanout_item_phase, operation_ref = ${o.operationRef ?? null}, safe_reason = ${o.reason?.slice(0, 80) ?? null},
           input_digest = ${o.digest ?? null}
      FROM event_fanout f
     WHERE f.id = ${fanoutId}::uuid AND i.fanout_id = f.id AND i.generation = f.selection_generation AND f.selection_phase = 'sealed'
       AND i.target_kind = ${kind} AND i.target_id = ${id}::uuid AND i.phase = 'pending'`;
  if (n === 1) await tx.$executeRaw`UPDATE event_fanout SET processed_count = processed_count + 1, updated_at = now() WHERE id = ${fanoutId}::uuid`;
  return n === 1;
}

/** Số mục của thế hệ niêm phong còn chờ (0 = xong). */
export async function pendingCount(tx: Pick<TenantTx, '$queryRaw'>, fanoutId: string): Promise<number> {
  const [r] = await tx.$queryRaw<{ left: number }[]>`
    SELECT count(*)::int AS left FROM event_fanout f JOIN event_fanout_item i ON i.fanout_id = f.id AND i.generation = f.selection_generation
     WHERE f.id = ${fanoutId}::uuid AND f.selection_phase = 'sealed' AND i.phase = 'pending'`;
  return r?.left ?? 0;
}
