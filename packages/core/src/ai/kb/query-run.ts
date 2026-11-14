// Run chịu phí embedding câu hỏi của `kb.search` (TIP-019b §3.1–3.2): có ActionContext.runId (tool trong một run) → cha tin cậy, trừ
// vào run đó (cha không tồn tại / đã xong → 409, không bịa gốc mới); gọi trực tiếp (UI) → một run gốc `consult` riêng, đóng ngay sau.
// TIP-020e: câu hỏi embed GHIM space của khe đang phục vụ; space đã gỡ → `{ retired: true }` (nhánh vector tắt, trả suy giảm), không lỗi.
import type { EmbedResult, Embedder } from '@appchat/ai';
import type { TenantDb } from '@appchat/db';
import type { ActionContext } from '../../kernel/actions/action-context';
import { isMeteringStop, queryEmbedder, type EmbedMeter } from '../runs/metered-embedding';
import { trustedParent } from '../runs/run-lineage';
import { RunStore } from '../runs/run.store';
import { kbSpaceEmbedder } from './reindex/space';

export async function queryRunFor(d: { db: TenantDb; embedder: Embedder; meter: EmbedMeter; now: () => Date }, ctx: ActionContext, query: string): Promise<EmbedResult | { retired: true } | null> {
  const store = new RunStore(d.db, d.now);
  const parent = await trustedParent(d.db, ctx, 'kb.search');
  const own = parent ? null : await store.create({ kind: 'consult', title: 'kb.search', tier: 'standard', input: { kind: 'kb.search' }, initiatedByUserId: ctx.onBehalfOfUserId ?? (ctx.actor.type === 'user' ? ctx.actor.id : null) });
  const run = parent ? await d.db.aiRun.findUniqueOrThrow({ where: { id: parent.parentRunId }, select: { id: true, rootRunId: true } }) : own!;
  const embed = queryEmbedder({ db: store.metered(), embedder: await kbSpaceEmbedder(d.db, d.embedder), meter: d.meter, now: d.now }, { ws: ctx.workspaceId, runId: run.id, rootRunId: run.rootRunId, source: 'kb' });
  try {
    const e = await embed(query);
    if (own) await store.finish(own.id, 'completed', { output: { text: '' } });
    return e;
  } catch (err) {
    if (own) await store.finish(own.id, 'failed', { error: String((err as { code?: string })?.code ?? 'embed_failed') });
    if (isMeteringStop(err)) throw err;
    return (err as { code?: string })?.code === 'EMBED_SPACE_RETIRED' ? { retired: true } : null;
  }
}
