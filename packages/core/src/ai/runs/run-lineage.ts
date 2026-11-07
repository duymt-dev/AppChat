// Cha tin cậy của run tiện ích (TIP-019b §3.1): chỉ lấy từ ActionContext.runId (do runtime đặt khi tool chạy trong một run), KHÔNG từ input
// model. Cha phải tồn tại trong tenant này và còn sống; cha không tồn tại → lỗi (không âm thầm thành gốc mới). Người gọi trực tiếp (UI,
// không có run) → gốc riêng. Mỗi (cha, bước, toolCallId / action) một run con: gọi lại dùng lại run con đã có (đang chạy → chờ, xong →
// trả kết quả), không sinh lại.
import { AppError } from '@appchat/shared';
import type { TenantDb } from '@appchat/db';
import type { ActionContext } from '../../kernel/actions/action-context';
import { TERMINAL } from './run.store';
import type { RunResult } from './runner';

type Db = Pick<TenantDb, 'aiRun'>;

export interface TrustedParent {
  parentRunId: string;
  /** Khoá con duy nhất dưới cha: `<action>:<khoá idempotent>` hoặc `<bước>:<action>` (bước = ActionContext.stepId do runtime đặt). */
  childKey: string;
}

/** Cha tin cậy từ ngữ cảnh action, hoặc null (gọi trực tiếp — gốc riêng). Cha không có / đã kết thúc → 409 (không bịa gốc mới). */
export async function trustedParent(db: Db, ctx: Pick<ActionContext, 'runId' | 'stepId' | 'idempotencyKey'>, actionId: string): Promise<TrustedParent | null> {
  if (!ctx.runId) return null;
  const p = await db.aiRun.findUnique({ where: { id: ctx.runId }, select: { id: true, status: true } });
  if (!p) throw new AppError('INVALID_STATE', 409, { run: 'parent_missing' }, 'Run cha không tồn tại trong workspace');
  if ((TERMINAL as readonly string[]).includes(p.status)) throw new AppError('INVALID_STATE', 409, { run: 'parent_finished' }, 'Run cha đã kết thúc');
  // Khoá idempotent (run + bước + id lời gọi tool) phân biệt hai lời gọi cùng action trong một bước; action đọc không có khoá → bước:action.
  return { parentRunId: p.id, childKey: ctx.idempotencyKey ? `${actionId}:${ctx.idempotencyKey}` : `${ctx.stepId ?? '0'}:${actionId}` };
}

/** Run con đã có của khoá này (gọi lại cùng lời gọi tool) — dùng lại, không tạo run mới. */
export async function existingChild(db: Db, parent: TrustedParent) {
  return db.aiRun.findFirst({ where: { parentRunId: parent.parentRunId, childKey: parent.childKey }, orderBy: { startedAt: 'asc' } });
}

const CHILD_WAIT_MS = 30_000;
const CHILD_POLL_MS = 250;

/** Kết quả của run con đã có: xong → trả kết quả cũ (không chạy lại); đang chạy → chờ tới khi xong (tối đa 30 giây rồi 409). */
export async function reuseChild(db: Db, parent: TrustedParent, waitMs = CHILD_WAIT_MS): Promise<(RunResult & { runId: string }) | null> {
  const until = Date.now() + waitMs;
  for (;;) {
    const c = await existingChild(db, parent);
    if (!c) return null;
    if ((TERMINAL as readonly string[]).includes(c.status)) {
      const out = (c.output ?? {}) as { text?: string; stop?: string };
      const status = c.status === 'completed' ? 'completed' : c.status === 'cancelled' ? 'cancelled' : 'failed';
      return { runId: c.id, status, text: out.text ?? '', creditsUsed: c.creditsUsed, stopReason: c.stopReason ?? undefined, ...(c.error && status === 'failed' ? { error: { code: 'LLM_ERROR', message: c.error } } : {}) };
    }
    if (Date.now() >= until) throw new AppError('INVALID_STATE', 409, { run: 'child_running' }, 'Lời gọi tiện ích này đang chạy');
    await new Promise((r) => setTimeout(r, CHILD_POLL_MS));
  }
}

/** Vi phạm unique (cha, khoá) khi hai lời gọi cùng tạo run con. */
export const isChildRace = (e: unknown): boolean => (e as { code?: string })?.code === 'P2002';
