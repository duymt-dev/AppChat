// privacy.cleanup_step (TIP-015c §1.3 point 7, §2.3-2.5, pha 2) — trusted system-only driver: mỗi lần gọi tiến MỘT bước theo
// PRIVACY_FLOW (accepted→fencing→inventory→erasing→needs_review|verifying→completed_with_exceptions). Lease CAS (lease_epoch) chặn
// hai worker chạy cùng operation; retry idempotent (gọi lại pha đã xong không làm gì thêm). Chỉ worker ROLE=jobs gọi qua sweep job
// (jobs/privacy.jobs.module.ts) — KHÔNG public, KHÔNG agent, KHÔNG HTTP (actor system:privacy-cleanup).
import { AppError, nextState, PRIVACY_FLOW, type PrivacyOperationPhase } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { privacyAdapterOf } from '../../kernel/privacy/registry';

export const PRIVACY_CLEANUP_ACTOR = 'privacy-cleanup';
export const PRIVACY_CLEANUP_BATCH = 100;

type OpRow = { id: string; phase: PrivacyOperationPhase; lease_epoch: number };

export interface CleanupStepOutcome {
  operationId: string;
  phase: PrivacyOperationPhase;
  advanced: boolean;
  erased: number;
  pending: number;
}

/** Khoá lạc quan: lấy đúng dòng đang ở `phase` hiện tại kèm lease_epoch — CAS khi ghi lại (tăng lease_epoch mỗi lần giữ). */
async function claim(tx: TenantTx, operationId: string): Promise<OpRow> {
  const [row] = await tx.$queryRaw<OpRow[]>`SELECT "id", "phase"::text AS phase, "lease_epoch" FROM "privacy_operation" WHERE "id" = ${operationId}::uuid FOR UPDATE`;
  if (!row) throw new AppError('NOT_FOUND', 404, { operation_id: 'not_found' });
  return row;
}

async function setPhase(tx: TenantTx, row: OpRow, to: PrivacyOperationPhase, now: Date): Promise<void> {
  await tx.$executeRaw`UPDATE "privacy_operation" SET "phase" = ${to}::privacy_operation_phase, "lease_epoch" = ${row.lease_epoch + 1}, "updated_at" = ${now} WHERE "id" = ${row.id}::uuid AND "lease_epoch" = ${row.lease_epoch}`;
}

/** Số mục chưa có disposition (chờ review_resolve) — còn > 0 thì KHÔNG được tiến quá `erasing` (phải vào needs_review). */
async function unresolvedCount(tx: TenantTx, operationId: string): Promise<number> {
  const [r] = await tx.$queryRaw<{ n: bigint }[]>`SELECT count(*)::bigint AS n FROM "privacy_item" WHERE "operation_id" = ${operationId}::uuid AND "disposition" IS NULL`;
  return Number(r!.n);
}

/** Một lô item đã có disposition erase_exclusive/redact_shared, chưa erased — gọi adapter.erase() theo domain ghi ở artifact. */
async function eraseBatch(tx: TenantTx, operationId: string, now: Date): Promise<{ erased: number; pending: number }> {
  const rows = await tx.$queryRaw<{ item_id: string; artifact_id: string; domain: string; kind: string; record_id: string; disposition: 'erase_exclusive' | 'redact_shared' }[]>`
    SELECT i."id" AS item_id, a."id" AS artifact_id, a."domain", a."kind", a."record_id", i."disposition"::text AS disposition
    FROM "privacy_item" i JOIN "privacy_artifact" a ON a."id" = i."artifact_id"
    WHERE i."operation_id" = ${operationId}::uuid AND i."disposition" IN ('erase_exclusive', 'redact_shared') AND a."state" <> 'erased'
    ORDER BY i."id" LIMIT ${PRIVACY_CLEANUP_BATCH}`;
  let erased = 0;
  let pending = 0;
  for (const r of rows) {
    try {
      const adapter = privacyAdapterOf(r.domain as never);
      await adapter.erase(tx, { kind: r.kind, recordId: r.record_id }, r.disposition, r.item_id);
      await tx.$executeRaw`UPDATE "privacy_artifact" SET "state" = 'erased', "updated_at" = ${now} WHERE "id" = ${r.artifact_id}::uuid`;
      await tx.$executeRaw`UPDATE "privacy_item" SET "resolved_at" = ${now}, "updated_at" = ${now} WHERE "id" = ${r.item_id}::uuid AND "resolved_at" IS NULL`;
      erased++;
    } catch (err) {
      // Domain chưa cài erase thật (NOT_IMPLEMENTED, 12/13 domain pha 2) — để pending, KHÔNG đánh dấu erased giả, không chặn domain khác.
      if (err instanceof AppError && err.code === 'NOT_IMPLEMENTED') {
        pending++;
        continue;
      }
      throw err;
    }
  }
  return { erased, pending };
}

/** Còn artifact disposition erase_exclusive/redact_shared mà state <> 'erased' — chưa xoá xong, chưa được qua `verifying`. */
async function uneraseCount(tx: TenantTx, operationId: string): Promise<number> {
  const [r] = await tx.$queryRaw<{ n: bigint }[]>`
    SELECT count(*)::bigint AS n FROM "privacy_item" i JOIN "privacy_artifact" a ON a."id" = i."artifact_id"
    WHERE i."operation_id" = ${operationId}::uuid AND i."disposition" IN ('erase_exclusive', 'redact_shared') AND a."state" <> 'erased'`;
  return Number(r!.n);
}

/** Tổng/đã xử lý/giữ lại — cập nhật counts hiển thị ở contact.privacy_status (report.ts đọc lại). */
async function refreshCounts(tx: TenantTx, operationId: string, now: Date): Promise<void> {
  await tx.$executeRaw`
    UPDATE "privacy_operation" SET
      "count_resolved" = (SELECT count(*) FROM "privacy_item" WHERE "operation_id" = ${operationId}::uuid AND "resolved_at" IS NOT NULL),
      "count_retained" = (SELECT count(*) FROM "privacy_item" WHERE "operation_id" = ${operationId}::uuid AND "disposition" = 'retained_issued'),
      "updated_at" = ${now}
    WHERE "id" = ${operationId}::uuid`;
}

/**
 * Một bước: tiến đúng MỘT chuyển trạng thái (fencing→inventory tự động vì đã kiểm kê sẵn lúc accept; erasing xoá tối đa một lô;
 * needs_review giữ nguyên tới khi review_resolve hết unresolved; verifying→completed_with_exceptions khi không còn gì chưa xoá).
 * Gọi lặp lại idempotent — ở `completed_with_exceptions` thì no-op (advanced=false).
 */
export async function cleanupStep(tx: TenantTx, operationId: string, now: Date): Promise<CleanupStepOutcome> {
  const row = await claim(tx, operationId);
  if (row.phase === 'completed_with_exceptions') return { operationId, phase: row.phase, advanced: false, erased: 0, pending: 0 };

  if (row.phase === 'accepted') {
    await setPhase(tx, row, 'fencing', now);
    return { operationId, phase: 'fencing', advanced: true, erased: 0, pending: 0 };
  }
  if (row.phase === 'fencing') {
    // Kiểm kê đã vật chất hoá sẵn lúc accept (operation.ts materializeInventory) — bước này chỉ xác nhận chuyển pha.
    await setPhase(tx, row, 'inventory', now);
    return { operationId, phase: 'inventory', advanced: true, erased: 0, pending: 0 };
  }
  if (row.phase === 'inventory') {
    const unresolved = await unresolvedCount(tx, operationId);
    const to: PrivacyOperationPhase = nextState(PRIVACY_FLOW, 'inventory', unresolved ? 'privacy.step:needs_review' : 'privacy.step:erasing')!;
    await setPhase(tx, row, to, now);
    return { operationId, phase: to, advanced: true, erased: 0, pending: 0 };
  }
  if (row.phase === 'erasing') {
    const { erased, pending } = await eraseBatch(tx, operationId, now);
    await refreshCounts(tx, operationId, now);
    const stillUnresolved = await unresolvedCount(tx, operationId);
    const stillUnerased = await uneraseCount(tx, operationId);
    if (stillUnresolved) {
      await setPhase(tx, row, 'needs_review', now);
      return { operationId, phase: 'needs_review', advanced: true, erased, pending };
    }
    if (stillUnerased) return { operationId, phase: 'erasing', advanced: erased > 0, erased, pending };
    await setPhase(tx, row, 'verifying', now);
    return { operationId, phase: 'verifying', advanced: true, erased, pending };
  }
  if (row.phase === 'needs_review') {
    const unresolved = await unresolvedCount(tx, operationId);
    if (unresolved) return { operationId, phase: 'needs_review', advanced: false, erased: 0, pending: unresolved };
    await setPhase(tx, row, 'erasing', now);
    return { operationId, phase: 'erasing', advanced: true, erased: 0, pending: 0 };
  }
  if (row.phase === 'verifying') {
    const unresolved = await unresolvedCount(tx, operationId);
    const unerased = await uneraseCount(tx, operationId);
    if (unresolved) {
      await setPhase(tx, row, 'needs_review', now);
      return { operationId, phase: 'needs_review', advanced: true, erased: 0, pending: unresolved };
    }
    if (unerased) {
      await setPhase(tx, row, 'erasing', now);
      return { operationId, phase: 'erasing', advanced: true, erased: 0, pending: unerased };
    }
    await setPhase(tx, row, 'completed_with_exceptions', now);
    await refreshCounts(tx, operationId, now);
    return { operationId, phase: 'completed_with_exceptions', advanced: true, erased: 0, pending: 0 };
  }
  // retryable_failed: thử lại từ pha gần nhất còn dữ liệu — về inventory để tính lại unresolved/unerased an toàn.
  await setPhase(tx, row, 'inventory', now);
  return { operationId, phase: 'inventory', advanced: true, erased: 0, pending: 0 };
}
