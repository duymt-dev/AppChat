// Trạng thái chỉ mục embedding cho `GET /v1/settings/kb` (TIP-020e §4.1) + đánh dấu "cũ" khi route embed đổi (§2.1). Chỉ đọc cấu hình router
// (không gọi provider, không trừ Credit). Đánh dấu cũ chỉ đổi `kb_setting.index_state` + outbox `kb.index_stale` — KHÔNG tạo job, không
// tự re-embed (DC-288): người có `kb.manage` bấm "Tạo lại chỉ mục" (`kb.reindex`) mới tốn Credit.
import type { Embedder } from '@appchat/ai';
import type { KbIndexStatus } from '@appchat/shared';
import type { TenantDb } from '@appchat/db';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { writeOutbox } from '../../../kernel/outbox/outbox';
import { inEventTransaction } from '../../../kernel/outbox/transaction';
import { lastUnpublished, openGeneration } from './generation.store';
import { readIndexSetting, sameSpace, spaceLabel } from './space';

/** Space mà embedder hiện hành sẽ dùng (route ưu tiên cao nhất) — null = chưa cấu hình route embed. */
export async function currentSpace(embedder: Embedder | null): Promise<string | null> {
  return (await embedder?.space?.())?.key ?? null;
}

/**
 * Route embed hiện hành khác space của khe đang phục vụ → đánh dấu `stale` (một lần — đã stale thì không ghi lại) + outbox. Kho chưa có
 * space (rỗng) → gắn luôn space hiện hành, không stale (chưa có vector nào để lệch). Trả trạng thái sau khi đối chiếu.
 */
export async function reconcileIndexState(db: TenantDb, ws: string, current: string | null, now: Date): Promise<'current' | 'stale'> {
  const s = await readIndexSetting(db);
  if (!current) return s.indexState;
  if (!s.activeSpace) {
    const vectors = await db.kbChunk.count({ where: { embedGenerationA: { not: null } } });
    if (!vectors) {
      await db.kbSetting.updateMany({ where: { id: 1, activeSpace: null }, data: { activeSpace: current, version: { increment: 1 } } });
      return 'current';
    }
  }
  if (sameSpace(s.activeSpace, current)) return s.indexState;
  if (s.indexState === 'stale') return 'stale';
  await inEventTransaction(db, ws, async (tx: TenantTx) => {
    const n = await tx.kbSetting.updateMany({ where: { id: 1, indexState: 'current' }, data: { indexState: 'stale', staleSince: now, version: { increment: 1 } } });
    if (n.count) await writeOutbox(tx, ws, [{ topic: 'kb.index_stale', payload: { generation_id: s.activeGenerationId } }], now);
  });
  return 'stale';
}

/** Trạng thái hiển thị: khe phục vụ + generation dở / lỗi gần nhất + suy giảm (route của khe đã gỡ → nhánh vector tắt). */
export async function readIndexStatus(db: TenantDb, ws: string, embedder: Embedder | null, now: Date): Promise<KbIndexStatus> {
  const current = await currentSpace(embedder);
  const state = await reconcileIndexState(db, ws, current, now);
  const s = await readIndexSetting(db);
  const open = await openGeneration(db);
  const shown = open ?? (await lastUnpublished(db, s.activeGenerationId));
  const live = s.activeSpace && embedder?.has ? await embedder.has(s.activeSpace) : true;
  return {
    state,
    phase: shown ? shown.phase : null,
    generation_id: shown?.id ?? null,
    active_space_label: spaceLabel(s.activeSpace),
    target_space_label: shown ? spaceLabel(shown.spaceKey) : state === 'stale' ? spaceLabel(current) : null,
    done: shown?.done ?? 0,
    expected: shown?.expected ?? 0,
    degraded: !current ? 'no_model_route' : live ? null : 'embed_space_retired',
    reason: shown?.reason ?? null,
  };
}
