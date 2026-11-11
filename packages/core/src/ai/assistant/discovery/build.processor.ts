// Worker ROLE=ai: processor queue `discovery-build` (TIP-023e §1.4-§1.6) — dựng vector cho MỘT generation đã được `assistant.
// discovery_prepare` xác nhận (claimGeneration đã giữ lease `building`). Mirror `kb-ingest.processor.ts`/`ingest.ts` cấu trúc: lấy
// corpus xác định (buildCorpus — registry hiện hành CHÍNH LÀ nguồn, không có corpus lưu sẵn để đọc lại; claimGeneration đã khoá
// corpus_hash lúc tạo lease nên so lại được), embed theo lô ≤64 TUẦN TỰ (§1.4 "batch≤64 and serialized, no unbounded parallel
// fanout"), ghi document + advanceGeneration SAU MỖI LÔ (không chờ hết corpus mới ghi — job chết giữa chừng thì lô đã ghi không
// embed lại, chạy lại chỉ còn document chưa có). Generation không còn `building` (race/đã reclaim ở tiến trình khác) → dừng NGAY.
import { createHash } from 'node:crypto';
import { Worker } from '../../../kernel/jobs/with-job-context';
import type { Redis } from 'ioredis';
import { TenantContexts, type TenantDb, type TenantDbResolver } from '@appchat/db';
import type { EmbedResult, ModelSource } from '@appchat/ai';
import { DISCOVERY_EMBED_DIM } from '@appchat/shared';
import type { AppLogger } from '../../../kernel/logger/logger';
import type { CreditMeter } from '../../../billing/services/credit-meter';
import { implementedBy, type ToolExecutor } from '../../../kernel/actions/executor';
import { buildCorpus } from './corpus';
import type { DiscoveryCorpus } from './types';
import { embedBatch, finishBuildRun } from './build-usage';
import { advanceGeneration, failGeneration, type GenerationRow } from './generation';
import { pinnedEmbedder } from './pinned-embedder';
import { DISCOVERY_BUILD_QUEUE, type DiscoveryBuildJob } from './build.queue';

const BATCH = 64;
const vecLit = (v: number[]) => `[${v.map((x) => x.toFixed(6)).join(',')}]`;

/** Id tất định (generation, actionId) — document của một batch ghi lại (retry job) không nhân đôi, UPSERT trên khoá này. */
function docId(generationId: string, actionId: string): string {
  const h = createHash('sha256').update(`discovery-doc|${generationId}|${actionId}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-7${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

export interface DiscoveryBuildDeps {
  tenants: TenantDbResolver;
  executor: ToolExecutor;
  models: ModelSource | null;
  meter: (Pick<CreditMeter, 'assertBalance' | 'charge'> & Partial<Pick<CreditMeter, 'price' | 'usage'>>) | null;
  log: AppLogger;
  now: () => Date;
  /** Sau mỗi lô có tiến độ → đánh dấu workspace cho outbox relay (an toàn, dù build không tự phát WS event riêng). */
  dirty?: (ws: string) => Promise<void>;
}

type BuildOutcome = { status: 'ready' | 'building' | 'skipped' | 'failed' };

/** Vector hợp lệ (§1.6 "Invalid/nonfinite/wrong-count/wrong-dimension vectors fail validation"): đúng số chiều, mọi phần tử hữu hạn. */
const validVector = (v: number[] | undefined): v is number[] => !!v && v.length === DISCOVERY_EMBED_DIM && v.every(Number.isFinite);

async function writeBatch(db: TenantDb, generationId: string, batch: DiscoveryCorpus['docs'], result: EmbedResult): Promise<void> {
  if (result.vectors.length !== batch.length) throw Object.assign(new Error(`embed trả ${result.vectors.length} vector cho ${batch.length} document`), { code: 'embed_count_mismatch' });
  for (const [j, doc] of batch.entries()) {
    const vec = result.vectors[j];
    if (!validVector(vec)) throw Object.assign(new Error(`vector của ${doc.actionId} không hợp lệ (số chiều / NaN)`), { code: 'embed_vector_invalid' });
    await db.$executeRaw`INSERT INTO action_discovery_document (id, generation_id, action_id, document_hash, embedding)
      VALUES (${docId(generationId, doc.actionId)}::uuid, ${generationId}::uuid, ${doc.actionId}, ${doc.documentHash}, ${vecLit(vec)}::vector)
      ON CONFLICT (generation_id, action_id) DO UPDATE SET document_hash = EXCLUDED.document_hash, embedding = EXCLUDED.embedding`;
  }
}

/** Advance còn lại khi mọi document đã ghi ở lần chạy trước nhưng generation chưa `ready` (job chết đúng giữa ghi document cuối
 *  và advanceGeneration của batch đó — hiếm). Không embed lại gì, chỉ tiến phần completed_count còn thiếu một lần. */
async function catchUp(db: TenantDb, generationId: string, now: Date, totalDocs: number): Promise<BuildOutcome> {
  const gen = await db.actionDiscoveryGeneration.findUnique({ where: { id: generationId } });
  if (!gen || gen.phase !== 'building') return { status: gen?.phase === 'ready' ? 'ready' : 'skipped' };
  if (gen.completedCount >= gen.expectedCount) return { status: 'building' };
  const advanced = await advanceGeneration(db, generationId, gen.expectedCount - gen.completedCount, now);
  if (advanced?.phase === 'ready') {
    await finishBuildRun(db, () => now, generationId, { status: 'completed', docs: totalDocs });
    return { status: 'ready' };
  }
  return { status: advanced ? 'building' : 'skipped' };
}

/** Dựng MỘT generation: ghim embedder đúng embedding_space của generation, embed tuần tự theo lô, ghi + advance sau mỗi lô. */
export async function buildGeneration(db: TenantDb, ws: string, generationId: string, d: Pick<DiscoveryBuildDeps, 'executor' | 'models' | 'meter' | 'now' | 'dirty'>): Promise<BuildOutcome> {
  const gen = await db.actionDiscoveryGeneration.findUnique({ where: { id: generationId } });
  if (!gen || gen.phase !== 'building') return { status: 'skipped' };
  if (!d.models) {
    await failGeneration(db, generationId, 'no_model_route', d.now());
    await finishBuildRun(db, d.now, generationId, { status: 'failed', error: 'no_model_route' });
    return { status: 'failed' };
  }
  const corpus = buildCorpus(implementedBy(d.executor));
  if (corpus.corpusHash !== gen.corpusHash) {
    // Registry đổi giữa lúc claim và lúc build chạy: generation này không còn khớp registry hiện hành — fail rõ, root chờ xác
    // nhận lại (ra corpus_hash mới / generation mới), không âm thầm build theo registry mới mà vẫn gắn corpus_hash cũ.
    await failGeneration(db, generationId, 'corpus_changed', d.now());
    await finishBuildRun(db, d.now, generationId, { status: 'failed', error: 'corpus_changed' });
    return { status: 'failed' };
  }
  const embedder = pinnedEmbedder(d.models, gen.embeddingSpace);
  const already = new Set((await db.actionDiscoveryDocument.findMany({ where: { generationId }, select: { actionId: true } })).map((r) => r.actionId));
  const pending = corpus.docs.filter((doc) => !already.has(doc.actionId));
  if (!pending.length) return catchUp(db, generationId, d.now(), corpus.docs.length);

  let gen2: GenerationRow | null = null;
  for (let i = 0; i < pending.length; i += BATCH) {
    const batch = pending.slice(i, i + BATCH);
    const batchStep = Math.floor(already.size / BATCH) + Math.floor(i / BATCH);
    let result: EmbedResult;
    try {
      result = await embedBatch(db, ws, generationId, batchStep, batch.map((doc) => doc.text), { embedder, meter: d.meter, now: d.now });
      await writeBatch(db, generationId, batch, result);
    } catch (err) {
      const code = String((err as { code?: string })?.code ?? 'embed_failed');
      // USAGE_UNKNOWN: chưa rõ lô đã chạy chưa — KHÔNG fail generation (batch có thể đã nhận ở phía provider). Để building; job
      // BullMQ retry gọi lại đúng batchStep này, biên nhận cũ tự đối soát trước khi (không) gửi lại.
      if (code === 'USAGE_UNKNOWN') throw err;
      await failGeneration(db, generationId, code, d.now());
      await finishBuildRun(db, d.now, generationId, { status: 'failed', error: code });
      return { status: 'failed' };
    }
    const advanced = await advanceGeneration(db, generationId, batch.length, d.now());
    if (!advanced) return { status: 'skipped' }; // generation không còn building (race ở tiến trình khác) — dừng, không ghi thêm.
    gen2 = advanced;
    await d.dirty?.(ws);
    if (advanced.phase === 'ready') {
      await finishBuildRun(db, d.now, generationId, { status: 'completed', docs: corpus.docs.length });
      return { status: 'ready' };
    }
  }
  return { status: gen2?.phase === 'ready' ? 'ready' : 'building' };
}

export function startDiscoveryBuildWorker(redis: Redis, d: DiscoveryBuildDeps): Worker<DiscoveryBuildJob> {
  const w = new Worker<DiscoveryBuildJob>(
    DISCOVERY_BUILD_QUEUE,
    async (job) => {
      const db = await d.tenants.get(TenantContexts.system(job.data.ws, 'discovery-build'));
      return buildGeneration(db, job.data.ws, job.data.generation_id, d);
    },
    { connection: redis.duplicate(), concurrency: 2 },
  );
  w.on('error', (err) => d.log.warn({ err }, 'discovery-build worker error'));
  return w;
}
