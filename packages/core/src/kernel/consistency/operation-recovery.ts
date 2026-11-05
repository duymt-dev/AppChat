// Khôi phục thao tác xuyên DB (TIP-045b annex A1): quét `action_operation` chưa xong đến hạn (index recovery), nhận lease + fence (tiến
// trình khác / hết lease không ghi đè), chạy ĐÚNG pha còn thiếu (áp tenant với biên nhận, xác nhận nền tảng). Chỉ hoàn tất ý định đã ghi;
// không tự sửa nghiệp vụ. Lỗi tạm → backoff; quá lượt → `compensation_required` (dead-letter, cần người / action được uỷ quyền xử lý).
import type { ActionDef } from '@appchat/actions';
import type { ActionHandler } from '../actions/handler';
import type { PlatformOperations } from './platform-operation';

export const RECOVERY_MAX_ATTEMPTS = 12;
export const RECOVERY_LEASE_MS = 60_000;
/** Thao tác trẻ hơn mức này để request đang chạy tự làm nốt (không giành việc với request). */
export const RECOVERY_GRACE_MS = 30_000;
const backoff = (attempt: number) => Math.min(30 * 60_000, 10_000 * 2 ** Math.max(0, attempt - 1));

export interface RecoveryDeps {
  ops: PlatformOperations;
  defs: Map<string, ActionDef>;
  handler: (id: string) => ActionHandler | undefined;
  now: () => Date;
  onError?: (operationId: string, err: unknown) => void;
}

export interface RecoveryReport {
  scanned: number;
  completed: number;
  pending: number;
  failed: number;
  dead: number;
}

/** Một lượt quét (gọi theo lịch). Trả số liệu cho log / metric. */
export async function recoverOperations(d: RecoveryDeps, limit = 50): Promise<RecoveryReport> {
  const now = d.now();
  const due = await d.ops.store.due(new Date(now.getTime() - RECOVERY_GRACE_MS), limit);
  const r: RecoveryReport = { scanned: due.length, completed: 0, pending: 0, failed: 0, dead: 0 };
  for (const x of due) {
    const fence = await d.ops.store.claim(x.id, d.now(), RECOVERY_LEASE_MS);
    if (fence === null) continue;
    const op = await d.ops.store.get(x.id);
    if (!op) continue;
    try {
      const out = await d.ops.recover({ ...op, fence }, d.defs, d.handler);
      r[out === 'complete' ? 'completed' : out]++;
      if (out === 'pending') await scheduleOrBury(d, op.id, fence, null);
    } catch (err) {
      d.onError?.(op.id, err);
      r.pending++;
      if (await scheduleOrBury(d, op.id, fence, err)) r.dead++;
    }
  }
  return r;
}

/** Hẹn lại theo backoff; quá lượt → compensation_required (không thử mù vô hạn). Trả true khi đã chôn. */
async function scheduleOrBury(d: RecoveryDeps, id: string, fence: number, err: unknown): Promise<boolean> {
  const cur = await d.ops.store.get(id);
  if (!cur || cur.phase === 'complete' || cur.phase === 'failed') return false;
  const attempts = await d.ops.attempts(id);
  const safe = err ? { name: (err as Error)?.name ?? 'Error', code: (err as { code?: string })?.code ?? null } : null;
  if (attempts >= RECOVERY_MAX_ATTEMPTS) {
    await d.ops.store.advance(d.ops.platformDb, id, cur.phase, 'compensation_required', d.now(), { error: safe ?? { code: 'MAX_ATTEMPTS' }, fence, nextAttemptAt: null });
    return true;
  }
  await d.ops.store.retryLater(id, fence, new Date(d.now().getTime() + backoff(attempts)), safe);
  return false;
}
