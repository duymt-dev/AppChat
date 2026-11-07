// Đo embedding của một lần nạp nguồn kho (TIP-019b §3.3): nạp là thao tác nền riêng — một run gốc `consult` cố định theo (nguồn, lần nạp)
// (job chạy lại dùng lại run + biên nhận, không tạo gốc mới), mỗi lô một biên nhận, nhóm `<run>:ingest:<lần nạp>` làm tròn một lần theo
// tổng các lô. Thay hẳn cách trừ gộp cũ (`kb:<nguồn>:<lần nạp>`) — không bao giờ cả hai. Không có ví theo ref (test đơn vị) → trừ gộp cũ.
import type { EmbedResult, Embedder } from '@appchat/ai';
import type { TenantDb } from '@appchat/db';
import type { CreditMeter } from '../../billing/services/credit-meter';
import { createHash } from 'node:crypto';
import { meteredEmbed } from '../runs/metered-embedding';
import { RunStore } from '../runs/run.store';

/** Id run cố định theo (nguồn, lần nạp) — dạng UUID từ sha256. */
function runIdOf(sourceId: string, seq: number): string {
  const h = createHash('sha256').update(`kb-ingest|${sourceId}|${seq}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-8${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** Nạp kho không theo ngân sách lượt chat — chặn bởi ví (rào mềm theo usage). */
const INGEST_BUDGET = 1_000_000;

type Meter = Pick<CreditMeter, 'assertBalance' | 'charge'> & Partial<Pick<CreditMeter, 'price' | 'usage'>>;

export async function embedChunks(db: unknown, ws: string, src: { id: string; seq: number; name: string }, values: string[], d: { embedder: Embedder; meter: Meter | null; now: () => Date }): Promise<EmbedResult> {
  const m = d.meter;
  const store = new RunStore(db as TenantDb, d.now);
  const mdb = store.metered();
  if (!m?.usage || !m.price || !mdb) {
    const e = await d.embedder.embed(values);
    if (m && e.tokens > 0) await m.charge({ workspaceId: ws, provider: e.provider, model: e.model, tokensIn: e.tokens, tokensOut: 0, runId: `kb:${src.id}`, stepIdx: src.seq, source: 'kb' });
    return e;
  }
  const id = runIdOf(src.id, src.seq);
  const run = (await store.get(id)) ?? (await store.create({ id, kind: 'consult', title: 'kb.ingest', tier: 'standard', input: { kind: 'kb.ingest', source_id: src.id, ingest_seq: src.seq }, maxCredits: INGEST_BUDGET }).catch(async () => (await store.get(id))!));
  const meter = { assertBalance: (w: string) => m.assertBalance(w), price: (p: string, mo: string) => m.price!(p, mo), usage: m.usage };
  try {
    const e = await meteredEmbed({ db: mdb, embedder: d.embedder, meter, now: d.now }, { ws, runId: run.id, rootRunId: run.rootRunId, kind: 'ingest', logicalStep: src.seq, source: 'kb' }, values);
    await store.finish(run.id, 'completed', { output: { text: '', chunks: values.length } });
    return e;
  } catch (err) {
    const code = String((err as { code?: string })?.code ?? 'embed_failed');
    // Lô chưa rõ kết quả → giữ run mở để đối soát; lỗi khác → run lỗi (lần nạp sau dùng run mới theo lần nạp mới).
    if (code !== 'USAGE_UNKNOWN') await store.finish(run.id, 'failed', { error: code });
    throw err;
  }
}
