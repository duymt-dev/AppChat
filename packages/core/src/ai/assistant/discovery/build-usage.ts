// Embed có đo cho một lần dựng kho discovery (TIP-023e §1.4-§1.6) — mirror `kb/ingest-usage.ts` embedChunks CÙNG CÁCH (run `consult`
// cố định theo khoá, lùi về trừ gộp cũ khi không có ví theo ref) nhưng KHÔNG dùng lại hàm đó: title/input của run phải phản ánh đúng
// "assistant.discovery_build" — mượn nhãn `kb.ingest` sẽ làm sai lịch sử usage. Run id tất định theo generation_id (không theo lần
// build — một generation chỉ build một lần qua một job BullMQ ổn định; chạy lại cùng job dùng lại đúng run + biên nhận). Mỗi batch
// (≤64 action, §1.4 "batch≤64 and serialized") là một `logicalStep` riêng dưới CÙNG run — build processor gọi lại cùng step của
// batch đã biết kết quả thì dùng lại biên nhận cũ (không gửi lại mù), batch mới thì step mới.
import { createHash } from 'node:crypto';
import type { EmbedResult, Embedder } from '@appchat/ai';
import type { TenantDb } from '@appchat/db';
import type { CreditMeter } from '../../../billing/services/credit-meter';
import { meteredEmbed } from '../../runs/metered-embedding';
import { RunStore } from '../../runs/run.store';

function runIdOf(generationId: string): string {
  const h = createHash('sha256').update(`discovery-build|${generationId}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-8${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** Dựng kho không theo ngân sách lượt chat — chặn bởi ví (rào mềm theo usage), mirror `INGEST_BUDGET`. */
const BUILD_BUDGET = 1_000_000;

type Meter = Pick<CreditMeter, 'assertBalance' | 'charge'> & Partial<Pick<CreditMeter, 'price' | 'usage'>>;

/** Run `consult` cố định theo generation — tạo nếu chưa có, dùng lại nếu đã có (chạy lại job không tạo run thứ hai). */
async function buildRun(store: RunStore, generationId: string): Promise<{ id: string; rootRunId: string } | null> {
  const id = runIdOf(generationId);
  const run = (await store.get(id)) ?? (await store.create({ id, kind: 'consult', title: 'assistant.discovery_build', tier: 'standard', input: { kind: 'assistant.discovery_build', generation_id: generationId }, maxCredits: BUILD_BUDGET }).catch(async () => (await store.get(id))!));
  return run ? { id: run.id, rootRunId: run.rootRunId } : null;
}

/** Embed một batch (≤64 document) của một generation. `kind: 'ingest'` tái dùng nhãn billing đã có (DB CHECK constraint
 *  `ai_usage_group_kind_check` chỉ nhận chat|query_embed|ingest) — về bản chất đây cũng là một lần nạp kho nền, không cần nhãn mới.
 *  `batchStep` = batch thứ mấy trong generation (0-based) — gọi lại cùng step của batch đã biết kết quả dùng lại biên nhận cũ. */
export async function embedBatch(db: TenantDb, ws: string, generationId: string, batchStep: number, values: string[], d: { embedder: Embedder; meter: Meter | null; now: () => Date }): Promise<EmbedResult> {
  const m = d.meter;
  const store = new RunStore(db, d.now);
  const mdb = store.metered();
  if (!m?.usage || !m.price || !mdb) {
    const e = await d.embedder.embed(values);
    if (m && e.tokens > 0) await m.charge({ workspaceId: ws, provider: e.provider, model: e.model, tokensIn: e.tokens, tokensOut: 0, runId: `discovery:${generationId}`, stepIdx: batchStep, source: 'assistant_discovery' });
    return e;
  }
  const run = (await buildRun(store, generationId))!;
  const meter = { assertBalance: (w: string) => m.assertBalance(w), price: (p: string, mo: string) => m.price!(p, mo), usage: m.usage };
  return meteredEmbed({ db: mdb, embedder: d.embedder, meter, now: d.now }, { ws, runId: run.id, rootRunId: run.rootRunId, kind: 'ingest', logicalStep: batchStep, source: 'assistant_discovery' }, values);
}

/** Đóng run `consult` của generation sau khi dựng xong (mọi batch — thành công hoặc dừng ở lỗi hạ tầng). */
export async function finishBuildRun(db: TenantDb, now: () => Date, generationId: string, outcome: { status: 'completed'; docs: number } | { status: 'failed'; error: string }): Promise<void> {
  const store = new RunStore(db, now);
  const id = runIdOf(generationId);
  if (!(await store.get(id))) return;
  if (outcome.status === 'completed') await store.finish(id, 'completed', { output: { text: '', chunks: outcome.docs } });
  else await store.finish(id, 'failed', { error: outcome.error.slice(0, 200) });
}
