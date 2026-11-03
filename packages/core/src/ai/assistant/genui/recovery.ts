// Thu hồi lượt Trợ lý mồ côi (TIP-023c "Fenced recovery"): tiến trình chạy lượt chết / treo → lease `running` hết hạn. Job ROLE=ai quét
// theo index `assistant_request_recovery_idx` (execution_state, lease_until, id) INCLUDE (run_id, fence) — trang id trước, ≤ 50 / lượt —
// rồi nhận lease (fence + 1, nguyên tử) và CHỐT lượt `failed` đúng một lần: ghi tin lỗi vào phiên + sự kiện `error` + `done` lên sổ
// stream (SSE / mở lại phiên không treo), run → failed. KHÔNG gọi lại model / tool: bước tool đã chạy có thể đã ghi (biên nhận theo khoá
// idempotent của bước) — chạy mù lại là ghi đôi. Tiến trình cũ quay lại: fence cũ → không ghi / chốt được. Lượt đã huỷ giữ nguyên huỷ.
import { TenantSql, type TenantDb } from '@appchat/db';
import { serverMessages } from '@appchat/shared';
import { RunStore } from '../../runs/run.store';
import { appendMessage } from '../sessions';
import { EventStore } from './event-store';
import { ExecutionLease } from './execution-lease';
import { RunStream, type Publisher } from './stream';

export const RECOVERY_PAGE = 50;
export const RECOVERY_EVERY_MS = 60_000;
export const ASSISTANT_ARMED_KEY = 'assistant:turns:armed';

type Db = TenantDb;

export interface RecoveryDeps {
  now: () => Date;
  pub: Publisher | null;
  locale?: string;
}

/** Id các lượt `running` có lease đã hết hạn (trang nhỏ, từ leaf index). */
export async function staleTurns(db: Pick<Db, '$queryRaw'>, now: Date, limit = RECOVERY_PAGE): Promise<{ run_id: string }[]> {
  return db.$queryRaw<{ run_id: string }[]>(TenantSql.sql`
    SELECT run_id FROM assistant_request
    WHERE execution_state = 'running' AND lease_until < ${now}
    ORDER BY lease_until, id LIMIT ${limit}`);
}

/** Chốt một lượt mồ côi. 'skipped' khi người khác vừa nhận lại / đã kết thúc. */
export async function recoverTurn(d: RecoveryDeps, db: Db, runId: string): Promise<'recovered' | 'skipped'> {
  const lease = await ExecutionLease.acquire(db, d.now, runId);
  if (!lease) return 'skipped';
  try {
    const req = await db.assistantRequest.findUnique({ where: { runId }, select: { sessionId: true } });
    const run = await db.aiRun.findUnique({ where: { id: runId }, select: { status: true } });
    if (!req || !run) return (await lease.finish('failed')) ? 'recovered' : 'skipped';
    if (run.status === 'cancelled') return (await lease.finish('cancelled')) ? 'recovered' : 'skipped';
    const message = serverMessages(d.locale ?? 'vi').ai.assistant.error.generic;
    const live = new RunStream(runId, new EventStore(db, d.now), d.pub, () => lease.holds());
    if (!(await lease.holds())) return 'skipped';
    await appendMessage(db, req.sessionId, 'assistant', [{ type: 'text', text: message }], runId, d.now());
    await live.emit({ type: 'error', code: 'WORKER_LOST', message });
    await live.emit({ type: 'done', status: 'failed', session_id: req.sessionId });
    await live.close();
    if (run.status === 'running' || run.status === 'queued') await new RunStore(db, d.now).finish(runId, 'failed', { error: 'WORKER_LOST' });
    return (await lease.finish('failed')) ? 'recovered' : 'skipped';
  } finally {
    lease.stop();
  }
}

/** Một lượt quét của workspace: số lượt đã chốt + còn lượt đang chạy (giữ đánh dấu) hay không. */
export async function recoverWorkspace(d: RecoveryDeps, db: Db): Promise<{ recovered: number; active: boolean }> {
  let recovered = 0;
  for (const r of await staleTurns(db, d.now())) if ((await recoverTurn(d, db, r.run_id)) === 'recovered') recovered++;
  const active = (await db.assistantRequest.findFirst({ where: { executionState: { in: ['queued', 'running'] } }, select: { id: true } })) !== null;
  return { recovered, active };
}

export interface ArmedTurns {
  list(): Promise<string[]>;
  remove(ws: string): Promise<void>;
}

/** Quét mọi workspace có lượt đang chạy (tập `assistant:turns:armed`, đánh dấu khi lượt nhận lease); lỗi một workspace không chặn khác. */
export async function recoverArmedTurns(d: RecoveryDeps, armed: ArmedTurns, tenant: (ws: string) => Promise<Db>, onError: (ws: string, err: unknown) => void): Promise<number> {
  let total = 0;
  for (const ws of await armed.list()) {
    try {
      const r = await recoverWorkspace(d, await tenant(ws));
      total += r.recovered;
      if (!r.active) await armed.remove(ws);
    } catch (err) {
      onError(ws, err);
    }
  }
  return total;
}
