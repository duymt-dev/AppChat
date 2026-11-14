// Chạy một generation tái tạo chỉ mục (TIP-020e §2.3–2.7) dưới lease. Mỗi lô: đọc ID TRƯỚC theo cursor (`id > $cursor ORDER BY id LIMIT 64`,
// chỉ nguồn còn hiệu lực), tải nội dung lô, THẢ transaction rồi embed (019b, ghim space đích), mở transaction mới ghi khe đích CÓ ĐIỀU KIỆN:
// lease còn đúng + thế hệ nạp nguồn (`ingest_seq`) chưa đổi + nguồn còn hiệu lực (nạp lại / xoá / quên trong lúc embed → bỏ đoạn đó, để
// catch-up). Chunk id giữ nguyên (chỉ UPDATE cột khe đích) → trích dẫn 020d không đổi. Hết lô → `catching_up`: quét đoạn còn thiếu tới khi
// 0 (≤ 3 vòng) rồi publish CAS. Lỗi Credit / ngân sách / usage không rõ / provider → `failed` với lý do riêng, khe cũ vẫn phục vụ.
import type { Embedder } from '@appchat/ai';
import { TenantSql as Prisma, type TenantDb } from '@appchat/db';
import { advance, claimLease, failGeneration, releaseLease, toCatchingUp, type GenRow } from './generation.store';
import { LIVE_SOURCE, missingCount, publishGeneration } from './publish';
import { embedReindexBatch, finishReindexRun, type ReindexMeter } from './reindex-usage';
import { slotCols } from './space';

export const REINDEX_BATCH = 64;
export const MAX_CATCHUP_ROUNDS = 3;

export interface ReindexDeps {
  embedder: Embedder | null;
  meter: ReindexMeter | null;
  now: () => Date;
  /** Dừng nhận lô mới (drain / tắt worker) — lô đang chạy ghi xong rồi nhả lease. */
  draining?: () => boolean;
  /** Workspace còn hoạt động (041: suspended / archived → dừng, giữ cursor). */
  active?: () => Promise<boolean>;
  /** Sau mỗi lô có tiến độ → đánh dấu outbox / WS làm mới trang trạng thái. */
  dirty?: () => Promise<void>;
}

export type ReindexOutcome = { status: 'published' | 'paused' | 'skipped' | 'failed' | 'busy'; reason?: string };

interface ChunkRow {
  id: string;
  content: string;
  seq: number;
  source_id: string;
}

const vecLit = (v: number[]) => `[${v.map((x) => x.toFixed(6)).join(',')}]`;

/** Lỗi → lý do bền (UI dịch): Credit / ngân sách / usage không rõ / route mất / provider. */
export function reasonOf(err: unknown): string {
  const code = String((err as { code?: string })?.code ?? '');
  if (code === 'CREDIT_EXHAUSTED') return 'credit_exhausted';
  if (code === 'USAGE_UNKNOWN') return 'usage_unknown';
  if (code === 'BUDGET' || code === 'INVALID_STATE') return 'budget';
  if (code === 'EMBED_SPACE_RETIRED' || code === 'NO_MODEL_ROUTE') return 'space_retired';
  if (code === 'VALIDATION_FAILED') return 'price_missing';
  return 'provider_unavailable';
}

/** ID trước: lô tiếp theo của khe đích (đoạn chưa có vector đúng generation), theo cursor id. */
async function nextIds(db: TenantDb, g: GenRow, cursor: string | null): Promise<string[]> {
  const k = slotCols(g.slot);
  const after = cursor ? Prisma.sql`AND c.id > ${cursor}::uuid` : Prisma.empty;
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT c.id::text AS id FROM kb_chunk c JOIN kb_source s ON s.id = c.source_id
    WHERE ${LIVE_SOURCE} AND ${k.gen} IS DISTINCT FROM ${g.id}::uuid ${after}
    ORDER BY c.id LIMIT ${REINDEX_BATCH}`;
  return rows.map((r) => r.id);
}

async function loadBatch(db: TenantDb, ids: string[]): Promise<ChunkRow[]> {
  return db.$queryRaw<ChunkRow[]>`
    SELECT c.id::text AS id, c.content, s.ingest_seq AS seq, s.id::text AS source_id FROM kb_chunk c JOIN kb_source s ON s.id = c.source_id
    WHERE c.id = ANY(${ids}::uuid[]) AND ${LIVE_SOURCE} ORDER BY c.id`;
}

/** Ghi khe đích trong MỘT transaction ngắn: lease còn đúng (khoá dòng generation) + nguồn còn hiệu lực đúng thế hệ nạp lúc tải. */
async function writeBatch(db: TenantDb, g: GenRow, token: string, rows: ChunkRow[], vectors: number[][], space: string): Promise<{ written: number; lost: boolean }> {
  const k = slotCols(g.slot);
  return db.$transaction(async (tx) => {
    const [lease] = await tx.$queryRaw<{ ok: boolean }[]>`SELECT (lease_token = ${token}::uuid AND phase IN ('building', 'catching_up')) AS ok FROM kb_embed_generation WHERE id = ${g.id}::uuid FOR UPDATE`;
    if (!lease?.ok) return { written: 0, lost: true };
    let written = 0;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]!;
      written += await tx.$executeRaw`
        UPDATE kb_chunk c SET ${k.vecW} = ${vecLit(vectors[i]!)}::vector, ${k.spaceW} = ${space}, ${k.genW} = ${g.id}::uuid
        FROM kb_source s WHERE c.id = ${r.id}::uuid AND s.id = c.source_id AND s.ingest_seq = ${r.seq} AND ${LIVE_SOURCE}`;
    }
    return { written, lost: false };
  });
}

/** Một lượt chạy (một job): giành lease → lô theo cursor → catch-up → publish. Kết quả không throw trừ lỗi hạ tầng DB. */
export async function runGeneration(db: TenantDb, ws: string, generationId: string, token: string, d: ReindexDeps): Promise<ReindexOutcome> {
  let g = await claimLease(db, generationId, token, d.now());
  if (!g) return { status: 'busy' };
  try {
    if (!d.embedder) {
      await failGeneration(db, g.id, 'space_retired', d.now(), token);
      return { status: 'failed', reason: 'space_retired' };
    }
    for (;;) {
      if (d.draining?.() || (d.active && !(await d.active()))) {
        await releaseLease(db, g.id, token, d.now());
        return { status: 'paused' };
      }
      const ids = await nextIds(db, g, g.phase === 'building' ? g.cursorChunkId : null);
      if (!ids.length) {
        if (g.phase === 'building') {
          if (!(await toCatchingUp(db, g.id, token, d.now()))) return { status: 'skipped' };
          g = { ...g, phase: 'catching_up', catchupRound: g.catchupRound + 1 };
          continue;
        }
        const p = await publishGeneration(db, ws, { id: g.id, slot: g.slot, spaceKey: g.spaceKey, token }, d.now());
        if (p.published) {
          await finishReindexRun(db, d.now, g.id, { ok: true, chunks: g.done });
          await d.dirty?.();
          return { status: 'published' };
        }
        if (p.reason === 'lost_lease') return { status: 'skipped' };
        // Thiếu đoạn giữa quét và publish (nguồn vừa nạp) → vòng catch-up kế, có trần.
        if (g.catchupRound >= MAX_CATCHUP_ROUNDS) return fail(db, g, token, 'catch_up_exhausted', d);
        if (!(await toCatchingUp(db, g.id, token, d.now()))) return { status: 'skipped' };
        g = { ...g, catchupRound: g.catchupRound + 1 };
        continue;
      }
      const rows = await loadBatch(db, ids);
      const last = ids[ids.length - 1]!;
      let written = 0;
      let tokens = 0;
      if (rows.length) {
        let e;
        try {
          e = await embedReindexBatch(db, ws, g, g.batchStep, rows.map((r) => r.content), { embedder: d.embedder, meter: d.meter, now: d.now });
        } catch (err) {
          return fail(db, g, token, reasonOf(err), d);
        }
        if (e.vectors.length !== rows.length) return fail(db, g, token, 'provider_unavailable', d);
        const w = await writeBatch(db, g, token, rows, e.vectors, g.spaceKey);
        if (w.lost) return { status: 'skipped' };
        written = w.written;
        tokens = e.tokens;
      }
      const phase: 'building' | 'catching_up' = g.phase === 'catching_up' ? 'catching_up' : 'building';
      if (!(await advance(db, g.id, token, { phase, cursor: phase === 'building' ? last : null, addDone: written, addTokens: tokens, now: d.now() }))) return { status: 'skipped' };
      g = { ...g, cursorChunkId: phase === 'building' ? last : g.cursorChunkId, done: g.done + written, batchStep: g.batchStep + 1 };
      await d.dirty?.();
      if (phase === 'catching_up' && written === 0 && (await missingCount(db, g.slot, g.id)) > 0) {
        // Đoạn thiếu không ghi được (nguồn đổi liên tục trong lúc chạy) — tính một vòng, có trần.
        if (g.catchupRound >= MAX_CATCHUP_ROUNDS) return fail(db, g, token, 'catch_up_exhausted', d);
        if (!(await toCatchingUp(db, g.id, token, d.now()))) return { status: 'skipped' };
        g = { ...g, catchupRound: g.catchupRound + 1 };
      }
    }
  } catch (err) {
    await releaseLease(db, generationId, token, d.now()).catch(() => undefined);
    throw err;
  }
}

async function fail(db: TenantDb, g: GenRow, token: string, reason: string, d: ReindexDeps): Promise<ReindexOutcome> {
  // Usage không rõ: KHÔNG kết thúc generation — biên nhận lô đang treo cần đối soát; giữ cursor, nhả lease, job sau thử lại đúng bước.
  if (reason === 'usage_unknown') {
    await releaseLease(db, g.id, token, d.now());
    return { status: 'paused', reason };
  }
  await failGeneration(db, g.id, reason, d.now(), token);
  await finishReindexRun(db, d.now, g.id, { ok: false, error: reason });
  await d.dirty?.();
  return { status: 'failed', reason };
}

export const PURGE_BATCH = 500;

/**
 * Dọn vector khe đích của generation đã kết thúc không publish (huỷ / thay thế / lỗi) theo lô — chỉ khi khe đó KHÔNG đang phục vụ (không bao
 * giờ chạm khe hoạt động). Đoạn đã bị generation mới ghi đè (generation khác) không bị đụng. Trả số đoạn đã dọn.
 */
export async function purgeGeneration(db: TenantDb, generationId: string): Promise<number> {
  const g = await db.kbEmbedGeneration.findUnique({ where: { id: generationId }, select: { slot: true, phase: true } });
  if (!g || !['cancelled', 'superseded', 'failed'].includes(g.phase)) return 0;
  const s = await db.kbSetting.findUnique({ where: { id: 1 }, select: { activeSlot: true, activeGenerationId: true } });
  if (s?.activeGenerationId === generationId || (s?.activeSlot ?? 'a') === g.slot) return 0;
  const k = slotCols(g.slot === 'b' ? 'b' : 'a');
  let total = 0;
  for (;;) {
    const n = await db.$executeRaw`
      UPDATE kb_chunk SET ${k.vecW} = NULL, ${k.spaceW} = NULL, ${k.genW} = NULL
      WHERE id IN (SELECT id FROM kb_chunk c WHERE ${k.gen} = ${generationId}::uuid ORDER BY c.id LIMIT ${PURGE_BATCH})`;
    total += n;
    if (n < PURGE_BATCH) return total;
  }
}
