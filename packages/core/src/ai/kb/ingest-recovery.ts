// Khôi phục nạp kho tri thức (TIP-006b §3.7, §4.1, AC4–5): nguồn `pending` (ý định nạp bền + ingest_seq) quá hạn mà chưa được nạp — đẩy job
// mất / Redis bị xoá sau commit — → đẩy lại đúng lần nạp hiện hành (job id `kb-<nguồn>-<seq>` → còn job thì BullMQ bỏ trùng). Mọi workspace
// active của DB nền tảng (không dựa tập Redis). Không chạm nguồn ready / failed (không nạp lại, không tốn credit).
import type { PlatformDb, TenantDb } from '@appchat/db';

export const KB_PENDING_STALE_MS = 2 * 60_000;
const PAGE = 200;

export async function recoverIngest(db: Pick<TenantDb, '$queryRaw'>, ws: string, push: (ws: string, s: { id: string; seq: number }[]) => Promise<void>, now: Date): Promise<number> {
  const rows = await db.$queryRaw<{ id: string; seq: number }[]>`
    SELECT id::text AS id, ingest_seq AS seq FROM kb_source WHERE status = 'pending' AND deleted_at IS NULL AND refreshed_at < ${new Date(now.getTime() - KB_PENDING_STALE_MS)}
     ORDER BY refreshed_at, id LIMIT ${PAGE}`;
  if (rows.length) await push(ws, rows);
  return rows.length;
}

export async function recoverAllIngest(platform: Pick<PlatformDb, 'workspace'>, tenant: (ws: string) => Promise<TenantDb>, push: (ws: string, s: { id: string; seq: number }[]) => Promise<void>, now: () => Date, onError: (ws: string, err: unknown) => void): Promise<void> {
  const list = await platform.workspace.findMany({ where: { dbStatus: 'active' }, select: { id: true } });
  for (const w of list) {
    try {
      await recoverIngest(await tenant(w.id), w.id, push, now());
    } catch (err) {
      onError(w.id, err);
    }
  }
}

/**
 * TIP-020e: generation tái tạo chỉ mục còn dở mà lease đã hết hạn (job mất / worker chết / drain) → đẩy lại job từ cursor bền (job id theo
 * cursor → đã có job cùng điểm thì BullMQ bỏ trùng). Không tạo generation, không trừ Credit ở đây.
 */
export async function recoverReindex(db: Pick<TenantDb, 'kbEmbedGeneration'>, ws: string, push: (ws: string, generationId: string, cursor: string | null) => Promise<void>, now: Date): Promise<boolean> {
  const g = await db.kbEmbedGeneration.findFirst({ where: { phase: { in: ['building', 'catching_up'] }, OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }] }, select: { id: true, cursorChunkId: true } });
  if (g) await push(ws, g.id, g.cursorChunkId);
  return !!g;
}
