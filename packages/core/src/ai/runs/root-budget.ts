// Ngân sách chung của cây run (TIP-019b §1, DC-251) — rào MỀM theo usage, không phải trần tiền tuyệt đối. Mỗi gốc nhận nhiều nhất MỘT
// lời gọi thật tại một thời điểm (`active_attempt_id`, CAS một câu UPDATE — không giữ khoá dòng qua mạng); nhả chỗ ngay sau khi ghi usage,
// TRƯỚC khi chạy tool / run con (không tự khoá chết khi delegate). Mở lời gọi chỉ khi: gốc chưa huỷ, không cách ly (lời gọi không rõ kết
// quả), `observed` (đã định giá, kể cả phần ví không đủ) < max của gốc VÀ subtree của mọi tổ tiên < max của tổ tiên đó.
import { AppError } from '@appchat/shared';
import type { TenantDb } from '@appchat/db';
import { DEFAULT_RUN_BUDGET } from './budget-defaults';

type Db = Pick<TenantDb, 'aiRun' | 'aiRootBudget' | '$executeRaw'>;

/** Chỗ bị chiếm lâu hơn mức này mà không có biên nhận xong = tiến trình chết giữa lời gọi → vẫn KHÔNG tự nhả (có thể đã chạy). */
export const ATTEMPT_WAIT_MS = 30_000;
const POLL_MS = 150;

export class RootBudgetBusy extends AppError {
  constructor() {
    super('CONFLICT', 409, { root: 'busy' }, 'Gốc đang có lời gọi model khác');
  }
}

/** Tạo dòng ngân sách cho gốc nếu chưa có (một lần — max lấy từ run gốc). */
export async function ensureRootBudget(db: Db, rootRunId: string): Promise<void> {
  await db.$executeRaw`
    INSERT INTO ai_root_budget (root_run_id, max_credits, observed, charged)
    SELECT id, COALESCE(max_credits, ${DEFAULT_RUN_BUDGET}), subtree_credits, subtree_credits FROM ai_run WHERE id = ${rootRunId}::uuid
    ON CONFLICT (root_run_id) DO NOTHING`;
}

/** Tổ tiên (kể cả chính run) còn sống — max riêng + subtree đã dùng. Độ sâu ≤ 2 nên ≤ 3 dòng. */
async function chain(db: Db, runId: string) {
  const out: { id: string; maxCredits: number | null; subtree: number; status: string }[] = [];
  for (let id: string | null = runId, guard = 0; id && guard < 6; guard++) {
    const r: { id: string; parentRunId: string | null; maxCredits: number | null; subtreeCredits: number; status: string } | null = await db.aiRun.findUnique({ where: { id }, select: { id: true, parentRunId: true, maxCredits: true, subtreeCredits: true, status: true } });
    if (!r) break;
    out.push({ id: r.id, maxCredits: r.maxCredits, subtree: r.subtreeCredits, status: r.status });
    id = r.parentRunId;
  }
  return out;
}

/**
 * Nhận chỗ gọi cho `attemptId` dưới gốc `rootRunId`. Chờ (thăm dò, huỷ được qua `signal`) khi gốc đang có lời gọi khác; từ chối
 * (BUDGET / CANCELLED / USAGE_UNKNOWN) khi không được gọi nữa. Gọi lại cùng attemptId (đã giữ chỗ) → thành công ngay.
 */
export async function admitAttempt(db: Db, o: { rootRunId: string; runId: string; attemptId: string; now: () => Date; signal?: AbortSignal; waitMs?: number }): Promise<void> {
  await ensureRootBudget(db, o.rootRunId);
  const deadline = o.now().getTime() + (o.waitMs ?? ATTEMPT_WAIT_MS);
  for (;;) {
    if (o.signal?.aborted) throw new AppError('INVALID_STATE', 409, { run: 'cancelled' }, 'Run đã huỷ');
    const ancestors = await chain(db, o.runId);
    if (ancestors.some((a) => a.status === 'cancelled')) throw new AppError('INVALID_STATE', 409, { run: 'cancelled' }, 'Run đã huỷ');
    // Run con: max riêng là hạn mức nhỏ hơn TRONG ví gốc, không phải ví thứ hai.
    if (ancestors.slice(0, -1).some((a) => a.maxCredits != null && a.subtree >= a.maxCredits)) throw budgetError();
    const n = await db.$executeRaw`
      UPDATE ai_root_budget SET active_attempt_id = ${o.attemptId}::uuid, active_since = ${o.now()}, updated_at = ${o.now()}
      WHERE root_run_id = ${o.rootRunId}::uuid AND NOT quarantined AND observed < max_credits
        AND (active_attempt_id IS NULL OR active_attempt_id = ${o.attemptId}::uuid)`;
    if (n === 1) return;
    const b = await db.aiRootBudget.findUnique({ where: { rootRunId: o.rootRunId } });
    if (!b) throw new AppError('NOT_FOUND', 404, { root: 'missing' });
    if (b.quarantined) throw new AppError('INVALID_STATE', 409, { usage: 'unknown' }, 'Có lời gọi model chưa rõ kết quả — dừng cây run tới khi đối soát');
    if (b.observed >= b.maxCredits) throw budgetError();
    if (o.now().getTime() >= deadline) throw new RootBudgetBusy();
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

const budgetError = () => new AppError('INVALID_STATE', 409, { budget: 'exhausted' }, 'Hết ngân sách credit của lượt');

/** Nhả chỗ (chỉ khi đúng attempt đang giữ). `quarantine` = lời gọi không rõ kết quả → khoá gốc, không mở lời gọi mới. */
export async function releaseAttempt(db: Db, rootRunId: string, attemptId: string, now: Date, quarantine = false): Promise<void> {
  await db.$executeRaw`
    UPDATE ai_root_budget SET active_attempt_id = NULL, active_since = NULL, quarantined = quarantined OR ${quarantine}, updated_at = ${now}
    WHERE root_run_id = ${rootRunId}::uuid AND active_attempt_id = ${attemptId}::uuid`;
}

/** Trước mỗi tool (TIP-019b §1.5): gốc chưa huỷ / cách ly, còn ngân sách. Không giữ chỗ — chỉ kiểm. */
export async function assertRootOpen(db: Db, rootRunId: string, runId: string): Promise<void> {
  const ancestors = await chain(db, runId);
  if (ancestors.some((a) => a.status === 'cancelled')) throw new AppError('INVALID_STATE', 409, { run: 'cancelled' }, 'Run đã huỷ');
  const b = await db.aiRootBudget.findUnique({ where: { rootRunId } });
  if (b?.quarantined) throw new AppError('INVALID_STATE', 409, { usage: 'unknown' }, 'Có lời gọi model chưa rõ kết quả');
  if (b && b.observed >= b.maxCredits) throw budgetError();
}
