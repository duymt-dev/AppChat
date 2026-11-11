// Lịch "Quên khách" (TIP-015c §1.3 point 7, pha 2): mỗi workspace đang hoạt động — mọi privacy_operation chưa completed_with_exceptions
// (index privacy_operation_active_idx) gọi `privacy.cleanup_step` MỘT lần/lượt quét (tiến đúng một bước — lần quét sau tiếp bước kế).
// Gọi qua ActionExecutor nguồn system actor `system:privacy-cleanup`. Dừng giữa chừng / crash an toàn: lease_epoch CAS ở cleanupStep
// không mất tiến độ, lần quét sau đọc lại đúng phase hiện tại. Lỗi một operation / workspace không chặn phần còn lại.
import { TenantContexts, type PlatformDb, type TenantDb, type TenantDbResolver } from '@appchat/db';
import { AppError } from '@appchat/shared';
import { runSystemAction, type SystemTrigger } from '../../kernel/actions/system';
import type { ActionExecutor } from '../../kernel/actions/executor';
import { PRIVACY_CLEANUP_ACTOR } from '../services/cleanup';

export const PRIVACY_SCHEDULER_QUEUE = 'privacy-scheduler';
export const PRIVACY_SWEEP_JOB = 'privacy.sweep';
export const PRIVACY_SWEEP_EVERY_MS = 60_000;
const BATCH = 100;

// KHÔNG gắn idempotencyKey cố định theo operation: cleanup_step phải chạy LẶP LẠI nhiều lần để tiến từng bước (mỗi lượt quét một
// bước) — khoá cố định sẽ làm executor phát lại đúng kết quả lần gọi đầu mãi mãi thay vì tiến tiếp. An toàn lặp gọi đã có sẵn ở
// cleanupStep (lease_epoch CAS, mỗi bước chỉ áp dụng khi đọc đúng epoch hiện tại) — không cần tầng idempotency của executor.
// TIP-003c: action riêng — capability gắn operation đã duyệt (nguồn schedule) + epoch hiện tại; verifier đọc lại operation đã lưu.
export const privacyCleanupTrigger = (ws: string, operationId: string, epoch: number): SystemTrigger => ({
  workspaceId: ws,
  actionId: 'privacy.cleanup_step',
  sourceKind: 'accepted_operation',
  sourceRef: operationId,
  targetId: operationId,
  generation: String(epoch),
  input: { operation_id: operationId },
  actor: PRIVACY_CLEANUP_ACTOR,
});

/** Verifier: operation có thật, đúng epoch đã đọc (không mở rộng phạm vi — chỉ operation bất biến đã chấp nhận). Đã kết thúc → để handler
 *  trả `advanced: false` ổn định (no_effect), không 409. */
export async function verifyPrivacyCleanup(t: Readonly<SystemTrigger>, db: TenantDb): Promise<void> {
  const op = await db.privacyOperation.findUnique({ where: { id: t.targetId }, select: { leaseEpoch: true } });
  if (!op || t.input.operation_id !== t.targetId) throw new AppError('NOT_FOUND', 404, { operation_id: 'not_found' });
  if (String(op.leaseEpoch) !== t.generation) throw new AppError('CONFLICT', 409, { operation_id: 'stale' });
}

export interface PrivacySweepDeps {
  platform: Pick<PlatformDb, 'workspace'>;
  tenants: TenantDbResolver;
  executor: Pick<ActionExecutor, 'execute'>;
  now: () => Date;
  onError?: (ws: string, operationId: string, err: unknown) => void;
}

/** Operation đang chạy (chưa completed_with_exceptions) — tối đa BATCH mỗi lượt quét mỗi workspace. */
async function activeOperations(db: TenantDb): Promise<{ id: string; lease_epoch: number }[]> {
  return db.$queryRaw<{ id: string; lease_epoch: number }[]>`
    SELECT "id", "lease_epoch" FROM "privacy_operation" WHERE "phase" <> 'completed_with_exceptions' ORDER BY "updated_at" LIMIT ${BATCH}`;
}

export async function sweepPrivacyWorkspace(db: TenantDb, ws: string, d: Pick<PrivacySweepDeps, 'executor' | 'tenants'>, onError?: (operationId: string, err: unknown) => void): Promise<number> {
  let advanced = 0;
  for (const { id, lease_epoch } of await activeOperations(db)) {
    try {
      const r = await runSystemAction<{ advanced: boolean }>(d.executor, d.tenants, privacyCleanupTrigger(ws, id, Number(lease_epoch)));
      if ((r.data as { result?: { advanced?: boolean } }).result?.advanced) advanced++;
    } catch (err) {
      onError?.(id, err);
    }
  }
  return advanced;
}

export async function sweepPrivacy(d: PrivacySweepDeps): Promise<{ advanced: number }> {
  const wss = await d.platform.workspace.findMany({ where: { dbStatus: 'active' }, select: { id: true } });
  let advanced = 0;
  for (const w of wss) {
    try {
      const db = await d.tenants.get(TenantContexts.system(w.id, PRIVACY_SWEEP_JOB));
      advanced += await sweepPrivacyWorkspace(db, w.id, d, (opId, err) => d.onError?.(w.id, opId, err));
    } catch (err) {
      d.onError?.(w.id, '', err);
    }
  }
  return { advanced };
}
