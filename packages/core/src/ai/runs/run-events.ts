// Sự kiện run đã commit (TIP-019b §5.3, DC-380): mỗi bước / chuyển trạng thái ghi một dòng `ai_run_event` (gốc, seq) — seq lấy từ
// `ai_run.event_seq` của dòng gốc, tăng trong CÙNG transaction — cùng outbox `run.step` / `run.done`. Payload chỉ là tín hiệu làm mới
// (id run + gốc + seq + trạng thái), không output / input / chữ model; client đọc lại chi tiết qua REST có scope. Không phát từ callback
// trước commit của engine (delta SSE của 023c là luồng tạm riêng).
import type { TenantDb } from '@appchat/db';
import type { TenantTx } from '../../kernel/actions/action-context';
import { writeOutbox } from '../../kernel/outbox/outbox';

export type RunEventKind = 'step' | 'status';

export interface RunEventInput {
  runId: string;
  kind: RunEventKind;
  status: string;
  stepIdx?: number | null;
}

/** Trạng thái kết thúc → `run.done` (một lần / run nhờ CAS ở RunStore.finish); còn lại → `run.step`. */
const DONE = new Set(['completed', 'failed', 'cancelled', 'handoff']);

/**
 * Ghi sự kiện trong transaction đang mở. `ws` = workspace (payload outbox). Trả seq đã cấp. Run không còn (đã xoá) → null, không ghi.
 */
export async function appendRunEvent(tx: TenantTx, ws: string, e: RunEventInput, now: Date): Promise<number | null> {
  const [run] = await tx.$queryRaw<{ root_run_id: string }[]>`SELECT root_run_id::text FROM ai_run WHERE id = ${e.runId}::uuid`;
  if (!run) return null;
  const [r] = await tx.$queryRaw<{ seq: number }[]>`UPDATE ai_run SET event_seq = event_seq + 1 WHERE id = ${run.root_run_id}::uuid RETURNING event_seq AS seq`;
  if (!r) return null;
  await tx.$executeRaw`
    INSERT INTO ai_run_event (root_run_id, seq, run_id, kind, status, step_idx, created_at)
    VALUES (${run.root_run_id}::uuid, ${r.seq}, ${e.runId}::uuid, ${e.kind}, ${e.status}, ${e.stepIdx ?? null}, ${now})`;
  const topic = e.kind === 'status' && DONE.has(e.status) ? 'run.done' : 'run.step';
  await writeOutbox(tx, ws, [{ topic, payload: { run_id: e.runId, root_run_id: run.root_run_id, seq: r.seq, status: e.status, ...(e.stepIdx != null ? { step_idx: e.stepIdx } : {}) } }], now);
  return r.seq;
}

/** Sự kiện của cây từ sau `afterSeq` (kết nối lại) — trang theo index (root_run_id, seq). */
export async function runEventsSince(db: Pick<TenantDb, 'aiRunEvent'>, rootRunId: string, afterSeq: number, limit = 100) {
  return db.aiRunEvent.findMany({ where: { rootRunId, seq: { gt: afterSeq } }, orderBy: { seq: 'asc' }, take: Math.min(limit, 500), select: { seq: true, runId: true, kind: true, status: true, stepIdx: true } });
}
