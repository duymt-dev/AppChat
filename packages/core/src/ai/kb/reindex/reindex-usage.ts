// Đo embedding của một lần tái tạo chỉ mục (TIP-020e §2.3, DC-302): run gốc `consult` cố định theo generation (job chạy lại dùng lại run +
// biên nhận), MỌI lô chung MỘT nhóm `<run>:ingest:0` (nhóm logic = generation — DC-251: làm tròn lên một lần theo tổng chi phí thô của cả
// generation, không phụ phí làm tròn từng lô); mỗi lô là một lượt biên nhận mới trong nhóm (`meteredEmbed` tự tăng lượt), lô còn treo
// (đã gửi / không rõ) → USAGE_UNKNOWN, không gửi lại mù. Cùng nguồn ví `kb` như nạp nguồn. Embed GHIM space đích của generation (không
// fallback chéo space). Không có ví theo ref (test đơn vị) → embed thường + trừ theo bước lô (đường cũ, chỉ dùng khi không có DB nền tảng).
import { createHash } from 'node:crypto';
import type { EmbedResult, Embedder } from '@appchat/ai';
import type { TenantDb } from '@appchat/db';
import type { CreditMeter } from '../../../billing/services/credit-meter';
import { meteredEmbed } from '../../runs/metered-embedding';
import { RunStore } from '../../runs/run.store';

const BUDGET = 1_000_000;

export type ReindexMeter = Pick<CreditMeter, 'assertBalance' | 'charge'> & Partial<Pick<CreditMeter, 'price' | 'usage'>>;

export function reindexRunId(generationId: string): string {
  const h = createHash('sha256').update(`kb-reindex|${generationId}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-8${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** Nhóm logic duy nhất của một generation (mọi lô cộng dồn rồi làm tròn một lần). */
export const REINDEX_GROUP_STEP = 0;

/** Embed một lô ≤ 64 đoạn của generation; `step` = số thứ tự lô (chỉ dùng ở đường trừ cũ). Lô treo của lượt trước → USAGE_UNKNOWN. */
export async function embedReindexBatch(db: TenantDb, ws: string, g: { id: string; spaceKey: string }, step: number, values: string[], d: { embedder: Embedder; meter: ReindexMeter | null; now: () => Date }): Promise<EmbedResult> {
  const m = d.meter;
  const store = new RunStore(db, d.now);
  const mdb = store.metered();
  if (!m?.usage || !m.price || !mdb) {
    const e = await d.embedder.embed(values, undefined, undefined, g.spaceKey);
    if (m && e.tokens > 0) await m.charge({ workspaceId: ws, provider: e.provider, model: e.model, tokensIn: e.tokens, tokensOut: 0, runId: `kb-reindex:${g.id}`, stepIdx: step, source: 'kb' });
    return e;
  }
  const id = reindexRunId(g.id);
  const run = (await store.get(id)) ?? (await store.create({ id, kind: 'consult', title: 'kb.reindex', tier: 'standard', input: { kind: 'kb.reindex', generation_id: g.id }, maxCredits: BUDGET }).catch(async () => (await store.get(id))!));
  const meter = { assertBalance: (w: string) => m.assertBalance(w), price: (p: string, mo: string) => m.price!(p, mo), usage: m.usage };
  const pinned: Embedder = { embed: (v, signal, hooks) => d.embedder.embed(v, signal, hooks, g.spaceKey) };
  return meteredEmbed({ db: mdb, embedder: pinned, meter, now: d.now }, { ws, runId: run.id, rootRunId: run.rootRunId, kind: 'ingest', logicalStep: REINDEX_GROUP_STEP, source: 'kb' }, values);
}

/** Đóng run của generation (xong / lỗi) — run không tồn tại (không có ví theo ref) → bỏ qua. */
export async function finishReindexRun(db: TenantDb, now: () => Date, generationId: string, outcome: { ok: true; chunks: number } | { ok: false; error: string }): Promise<void> {
  const store = new RunStore(db, now);
  const id = reindexRunId(generationId);
  if (!(await store.get(id))) return;
  if (outcome.ok) await store.finish(id, 'completed', { output: { text: '', chunks: outcome.chunks } });
  else await store.finish(id, 'failed', { error: outcome.error.slice(0, 200) });
}
