// Lịch "Quên khách" (TIP-015c §1.3 point 7, pha 2): mỗi workspace đang hoạt động — mọi privacy_operation chưa completed_with_exceptions
// (index privacy_operation_active_idx) gọi `privacy.cleanup_step` MỘT lần/lượt quét (tiến đúng một bước — lần quét sau tiếp bước kế).
// Gọi qua ActionExecutor nguồn system actor `system:privacy-cleanup`. Dừng giữa chừng / crash an toàn: lease_epoch CAS ở cleanupStep
// không mất tiến độ, lần quét sau đọc lại đúng phase hiện tại. Lỗi một operation / workspace không chặn phần còn lại.
import { TenantContexts, type PlatformDb, type TenantDb, type TenantDbResolver } from '@appchat/db';
import type { ActionContext } from '../../kernel/actions/action-context';
import type { ActionExecutor } from '../../kernel/actions/executor';
import { PRIVACY_CLEANUP_ACTOR } from '../services/cleanup';

export const PRIVACY_SCHEDULER_QUEUE = 'privacy-scheduler';
export const PRIVACY_SWEEP_JOB = 'privacy.sweep';
export const PRIVACY_SWEEP_EVERY_MS = 60_000;
const BATCH = 100;

// KHÔNG gắn idempotencyKey cố định theo operation: cleanup_step phải chạy LẶP LẠI nhiều lần để tiến từng bước (mỗi lượt quét một
// bước) — khoá cố định sẽ làm executor phát lại đúng kết quả lần gọi đầu mãi mãi thay vì tiến tiếp. An toàn lặp gọi đã có sẵn ở
// cleanupStep (lease_epoch CAS, mỗi bước chỉ áp dụng khi đọc đúng epoch hiện tại) — không cần tầng idempotency của executor.
export const privacyCleanupCtx = (ws: string): ActionContext => ({
  workspaceId: ws,
  source: 'system',
  actor: { type: 'system', id: PRIVACY_CLEANUP_ACTOR },
  authz: { isOwner: true } as never,
});

export interface PrivacySweepDeps {
  platform: Pick<PlatformDb, 'workspace'>;
  tenants: TenantDbResolver;
  executor: Pick<ActionExecutor, 'execute'>;
  now: () => Date;
  onError?: (ws: string, operationId: string, err: unknown) => void;
}

/** Operation đang chạy (chưa completed_with_exceptions) — tối đa BATCH mỗi lượt quét mỗi workspace. */
async function activeOperations(db: TenantDb): Promise<string[]> {
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "privacy_operation" WHERE "phase" <> 'completed_with_exceptions' ORDER BY "updated_at" LIMIT ${BATCH}`;
  return rows.map((r) => r.id);
}

export async function sweepPrivacyWorkspace(db: TenantDb, ws: string, d: Pick<PrivacySweepDeps, 'executor'>, onError?: (operationId: string, err: unknown) => void): Promise<number> {
  let advanced = 0;
  for (const id of await activeOperations(db)) {
    try {
      const r = await d.executor.execute<{ advanced: boolean }>(privacyCleanupCtx(ws), 'privacy.cleanup_step', { operation_id: id });
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
