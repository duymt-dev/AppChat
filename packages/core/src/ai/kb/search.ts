// Tìm kết hợp trong kho tri thức (rag §6–8): top-20 theo vector (cosine, HNSW, `hnsw.iterative_scan` khi có lọc) + top-20 theo từ khoá
// không dấu (`content_norm` trigram) → RRF (k = 60) → (rerank tuỳ chọn) → top-6. Ngưỡng căn cứ: cosine cao nhất < `min_score` và không đoạn
// nào khớp từ khoá đủ mạnh → `grounded=false`, không trả đoạn (agent không bịa). Đoạn có giá (`meta.volatile`) không bao giờ ra (rag §4).
// TIP-020c: lọc theo restriction tin cậy (phạm vi nhận ∧ phạm vi hiện hành ∧ quyền nguồn hiện hành — scope/query.ts) TRƯỚC khi chọn ứng
// viên; hai nhánh chỉ chọn id + điểm + thế hệ nguồn, nội dung / tên / đường dẫn chỉ đọc cho đúng top-N sau RRF (deferred join) và kiểm lại
// vị từ + thế hệ lúc đọc. Không còn đường tìm "visibility + mảng tuỳ chọn" (mảng rỗng từng nghĩa là "tất cả").
// TIP-020e: nhánh vector chỉ so KHE ĐANG PHỤC VỤ (`kb_setting.active_slot`), đúng generation của khe (mọi vector của generation cùng một
// space — ingest / reindex chỉ ghi khe khi embed ghim đúng space đó); câu hỏi phải embed ghim cùng space —
// space khác / route của khe đã gỡ → nhánh vector tắt, `degraded: embed_space_retired` + nhánh từ khoá (trung thực, không im lặng). Rerank
// (nếu có) chạy NGOÀI transaction trên tập ứng viên ≤ 40 (`selectCandidates` → rerank-stage → `materialize` kiểm lại vị từ).
import { rrf, type EmbedResult, type Embedder, type RerankStatus } from '@appchat/ai';
import { TenantSql as Prisma, type TenantDb } from '@appchat/db';
import type { Restriction } from './scope/authority';
import { sourceSql } from './scope/query';
import type { KnowledgeRef } from './scope/types';
import { readIndexSetting, sameSpace, slotCols, spaceOf } from './reindex/space';

export const KB_TOP_K = 20;
export const KB_CONTEXT = 6;
export const DEFAULT_MIN_SCORE = 0.35;
/** Similarity trigram tối thiểu để một đoạn từ khoá được coi là căn cứ (khi vector chưa đủ ngưỡng). */
const KEYWORD_GROUND = 0.3;

export type KbDegraded = 'embed_space_retired';

export interface KbSearchInput {
  query: string;
  /** Restriction đã nhận (scope/authority.ts `admit`) — bắt buộc; không có đường tìm không giới hạn. */
  restriction: Restriction;
  limit?: number;
  /** Vector câu hỏi đã embed (có đo, ngoài transaction — TIP-019b §3.2); có thì không gọi embedder. */
  queryEmbedding?: EmbedResult | null;
  /** Mã lỗi embed câu hỏi của người gọi (TIP-020e) — `EMBED_SPACE_RETIRED` → kết quả ghi suy giảm. */
  embedError?: string | null;
  /** Thứ tự đã rerank ngoài transaction (id ⊆ ứng viên); `materialize` vẫn kiểm lại vị từ từng id. */
  ordered?: { ids: string[]; rerank: RerankStatus } | null;
}

export interface KbHit {
  chunk_id: string;
  source_id: string;
  source_name: string;
  content: string;
  path: string[];
  score: number;
  /** Thế hệ nạp của nguồn lúc truy hồi (TIP-020d — sổ bí danh trích dẫn). */
  generation?: number;
}

export interface KbSearchResult {
  grounded: boolean;
  /** Cosine cao nhất của nhánh vector (0 khi không có). */
  top_score: number;
  min_score: number;
  chunks: KbHit[];
  citations: { source_id: string; chunk_id: string }[];
  /** Nguồn + thế hệ đã đưa ra (provenance của run — không trả cho model). */
  refs: Omit<KnowledgeRef, 'b'>[];
  /** TIP-020e: nhánh vector tắt vì space của khe không còn route. */
  degraded?: KbDegraded | null;
  rerank?: RerankStatus;
}

/** Ứng viên đã chọn (chỉ id + điểm) — RRF đầy đủ ≤ 40 + điểm căn cứ. */
export interface KbCandidates {
  min: number;
  top: number;
  grounded: boolean;
  fused: { id: string; score: number }[];
  degraded: KbDegraded | null;
}

type Raw = Pick<TenantDb, '$queryRaw' | '$executeRaw'>;
type Db = Raw & Pick<TenantDb, 'kbSetting'> & { $transaction?: TenantDb['$transaction'] };

/** `SET LOCAL` chỉ có hiệu lực trong transaction: client thường → mở transaction; đã là transaction (handler) → chạy thẳng. */
const inTx = <T>(db: Db, f: (t: Raw) => Promise<T>): Promise<T> => (typeof db.$transaction === 'function' ? db.$transaction((t) => f(t)) : f(db));

const vecLit = (v: number[]) => `[${v.map((x) => (Number.isFinite(x) ? x.toFixed(6) : '0')).join(',')}]`;

const VOLATILE = Prisma.sql`coalesce((c.meta->>'volatile')::boolean, false) = false`;

interface Row {
  id: string;
  source_id: string;
  source_name: string;
  content: string;
  meta: { path?: string[] } | null;
  seq: number;
}

export async function minScoreOf(db: Pick<TenantDb, 'kbSetting'>): Promise<number> {
  return (await db.kbSetting.findUnique({ where: { id: 1 } }))?.minScore ?? DEFAULT_MIN_SCORE;
}

export const emptyResult = (min: number, top = 0, degraded: KbDegraded | null = null): KbSearchResult => ({ grounded: false, top_score: top, min_score: min, chunks: [], citations: [], refs: [], ...(degraded ? { degraded } : {}) });

const whereOf = (r: Restriction) => Prisma.sql`${sourceSql(r)} AND ${VOLATILE}`;

/** Hai nhánh (vector khe hoạt động + từ khoá) → RRF. Không đọc nội dung. */
export async function selectCandidates(db: Db, embedder: Embedder | null, i: KbSearchInput): Promise<KbCandidates> {
  const query = i.query.trim();
  const min = await minScoreOf(db);
  if (!query) return { min, top: 0, grounded: false, fused: [], degraded: null };
  const where = whereOf(i.restriction);
  const set = await readIndexSetting(db);
  let degraded: KbDegraded | null = i.embedError === 'EMBED_SPACE_RETIRED' ? 'embed_space_retired' : null;

  // Nhánh vector: câu hỏi embed GHIM space của khe đang phục vụ; chỉ so đoạn có cùng space ở khe đó. Chỉ id + điểm.
  let vec: { id: string; score: number }[] = [];
  let e = i.queryEmbedding ?? null;
  if (!e && embedder && set.activeSpace && !degraded) {
    e = await embedder.embed([query], undefined, undefined, set.activeSpace).catch((err: unknown) => {
      if ((err as { code?: string })?.code !== 'EMBED_SPACE_RETIRED') throw err;
      degraded = 'embed_space_retired';
      return null;
    });
  }
  if (e && set.activeSpace && !sameSpace(set.activeSpace, spaceOf(e))) degraded = 'embed_space_retired';
  else if (e && set.activeSpace && set.activeGenerationId) {
    const q = vecLit(e.vectors[0]!);
    const k = slotCols(set.activeSlot);
    vec = await inTx(db, async (tx) => {
      await tx.$executeRaw`SET LOCAL hnsw.iterative_scan = relaxed_order`;
      return tx.$queryRaw<{ id: string; score: number }[]>`
        SELECT c.id, 1 - (${k.vec} <=> ${q}::vector) AS score
        FROM kb_chunk c JOIN kb_source s ON s.id = c.source_id
        WHERE ${where} AND ${k.vec} IS NOT NULL AND ${k.gen} = ${set.activeGenerationId}::uuid
        ORDER BY ${k.vec} <=> ${q}::vector
        LIMIT ${KB_TOP_K}`;
    });
  }

  // Nhánh từ khoá không dấu: trigram trên content_norm (GIN) — word_similarity để câu hỏi ngắn khớp đoạn dài.
  // Ngưỡng `<%` mặc định 0.6 quá chặt với câu hỏi nhiều từ → 0.3 (vẫn dùng GIN trgm), xếp theo word_similarity.
  const kw = await inTx(db, async (tx) => {
    await tx.$executeRaw`SET LOCAL pg_trgm.word_similarity_threshold = 0.3`;
    return tx.$queryRaw<{ id: string; score: number }[]>`
    SELECT c.id, word_similarity(f_unaccent(lower(${query})), c.content_norm) AS score
    FROM kb_chunk c JOIN kb_source s ON s.id = c.source_id
    WHERE ${where} AND f_unaccent(lower(${query})) <% c.content_norm
    ORDER BY score DESC, c.id
    LIMIT ${KB_TOP_K}`;
  });

  const top = vec.length ? Number(vec[0]!.score) : 0;
  const kwTop = kw.length ? Number(kw[0]!.score) : 0;
  const grounded = !(top < min && kwTop < KEYWORD_GROUND);
  return { min, top, grounded, fused: grounded ? rrf([vec.map((r) => r.id), kw.map((r) => r.id)]) : [], degraded };
}

/** Nội dung ứng viên cho rerank — đọc lại dưới cùng restriction (nguồn có thể vừa đổi). */
export async function candidateContent(db: Pick<TenantDb, '$queryRaw'>, ids: string[], r: Restriction): Promise<Map<string, string>> {
  if (!ids.length) return new Map();
  const rows = await db.$queryRaw<{ id: string; content: string }[]>`
    SELECT c.id, c.content FROM kb_chunk c JOIN kb_source s ON s.id = c.source_id WHERE c.id = ANY(${ids}::uuid[]) AND ${whereOf(r)}`;
  return new Map(rows.map((x) => [x.id, x.content]));
}

/** Deferred: nội dung / tên / đường dẫn chỉ cho đúng top-N (thứ tự RRF hoặc thứ tự rerank ⊆ ứng viên), kiểm lại vị từ từng id. */
export async function materialize(db: Pick<TenantDb, '$queryRaw'>, i: KbSearchInput, c: KbCandidates): Promise<KbSearchResult> {
  if (!c.grounded) return emptyResult(c.min, c.top, c.degraded);
  const limit = i.limit ?? 6;
  const score = new Map(c.fused.map((f) => [f.id, f.score]));
  const ids = i.ordered ? i.ordered.ids.filter((id) => score.has(id)).slice(0, limit) : c.fused.slice(0, limit).map((f) => f.id);
  const rows = ids.length
    ? await db.$queryRaw<Row[]>`
        SELECT c.id, c.source_id, s.name AS source_name, c.content, c.meta, s.ingest_seq AS seq
        FROM kb_chunk c JOIN kb_source s ON s.id = c.source_id
        WHERE c.id = ANY(${ids}::uuid[]) AND ${whereOf(i.restriction)}`
    : [];
  const byId = new Map(rows.map((r) => [r.id, r]));
  const chunks = ids.flatMap((id) => {
    const r = byId.get(id);
    return r ? [{ chunk_id: r.id, source_id: r.source_id, source_name: r.source_name, content: r.content, path: r.meta?.path ?? [], score: score.get(id)!, generation: Number(r.seq) }] : [];
  });
  if (!chunks.length) return emptyResult(c.min, c.top, c.degraded);
  const refs = [...new Map(rows.map((r) => [r.source_id, { s: r.source_id, g: Number(r.seq) }])).values()];
  return {
    grounded: true,
    top_score: c.top,
    min_score: c.min,
    chunks,
    citations: chunks.map((x) => ({ source_id: x.source_id, chunk_id: x.chunk_id })),
    refs,
    ...(c.degraded ? { degraded: c.degraded } : {}),
    rerank: i.ordered?.rerank ?? 'not_configured',
  };
}

export async function searchKb(db: Db, embedder: Embedder | null, i: KbSearchInput): Promise<KbSearchResult> {
  return materialize(db, i, await selectCandidates(db, embedder, i));
}
