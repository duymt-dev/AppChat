// Tìm kết hợp trong kho tri thức (rag §6–8): top-20 theo vector (cosine, HNSW, `hnsw.iterative_scan` khi có lọc) + top-20 theo từ khoá
// không dấu (`content_norm` trigram) → RRF (k = 60) → top-6. Ngưỡng căn cứ: cosine cao nhất < `min_score` và không đoạn nào khớp từ
// khoá đủ mạnh → `grounded=false`, không trả đoạn (agent không bịa). Đoạn có giá (`meta.volatile`) không bao giờ ra (rag §4).
// TIP-020c: lọc theo restriction tin cậy (phạm vi nhận ∧ phạm vi hiện hành ∧ quyền nguồn hiện hành — scope/query.ts) TRƯỚC khi chọn ứng
// viên; hai nhánh chỉ chọn id + điểm + thế hệ nguồn, nội dung / tên / đường dẫn chỉ đọc cho đúng top-N sau RRF (deferred join) và kiểm lại
// vị từ + thế hệ lúc đọc. Không còn đường tìm "visibility + mảng tuỳ chọn" (mảng rỗng từng nghĩa là "tất cả").
import { rrf, type EmbedResult, type Embedder } from '@appchat/ai';
import { TenantSql as Prisma, type TenantDb } from '@appchat/db';
import type { Restriction } from './scope/authority';
import { sourceSql } from './scope/query';
import type { KnowledgeRef } from './scope/types';

export const KB_TOP_K = 20;
export const KB_CONTEXT = 6;
export const DEFAULT_MIN_SCORE = 0.35;
/** Similarity trigram tối thiểu để một đoạn từ khoá được coi là căn cứ (khi vector chưa đủ ngưỡng). */
const KEYWORD_GROUND = 0.3;

export interface KbSearchInput {
  query: string;
  /** Restriction đã nhận (scope/authority.ts `admit`) — bắt buộc; không có đường tìm không giới hạn. */
  restriction: Restriction;
  limit?: number;
  /** Vector câu hỏi đã embed (có đo, ngoài transaction — TIP-019b §3.2); có thì không gọi embedder. */
  queryEmbedding?: EmbedResult | null;
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
}

type Raw = Pick<TenantDb, '$queryRaw' | '$executeRaw'>;
type Db = Raw & Pick<TenantDb, 'kbSetting'> & { $transaction?: TenantDb['$transaction'] };

/** `SET LOCAL` chỉ có hiệu lực trong transaction: client thường → mở transaction; đã là transaction (handler) → chạy thẳng. */
const inTx = <T>(db: Db, f: (t: Raw) => Promise<T>): Promise<T> => (typeof db.$transaction === 'function' ? db.$transaction((t) => f(t)) : f(db));

const vecLit = (v: number[]) => `[${v.map((x) => (Number.isFinite(x) ? x.toFixed(6) : '0')).join(',')}]`;

const VOLATILE = Prisma.sql`coalesce((c.meta->>'volatile')::boolean, false) = false`;

interface Cand {
  id: string;
  score: number;
}

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

export const emptyResult = (min: number, top = 0): KbSearchResult => ({ grounded: false, top_score: top, min_score: min, chunks: [], citations: [], refs: [] });

export async function searchKb(db: Db, embedder: Embedder | null, i: KbSearchInput): Promise<KbSearchResult> {
  const query = i.query.trim();
  const min = await minScoreOf(db);
  if (!query) return emptyResult(min);
  const where = Prisma.sql`${sourceSql(i.restriction)} AND ${VOLATILE}`;

  // Nhánh vector: embed câu hỏi bằng cùng router; so đúng các đoạn cùng embed_model (đổi model → job re-embed — rag §10). Chỉ id + điểm.
  let vec: Cand[] = [];
  const e = i.queryEmbedding ?? (embedder ? await embedder.embed([query]) : null);
  if (e) {
    const q = vecLit(e.vectors[0]!);
    vec = await inTx(db, async (tx) => {
      await tx.$executeRaw`SET LOCAL hnsw.iterative_scan = relaxed_order`;
      return tx.$queryRaw<Cand[]>`
        SELECT c.id, 1 - (c.embedding <=> ${q}::vector) AS score
        FROM kb_chunk c JOIN kb_source s ON s.id = c.source_id
        WHERE ${where} AND c.embedding IS NOT NULL AND c.embed_model = ${`${e.provider}:${e.model}`}
        ORDER BY c.embedding <=> ${q}::vector
        LIMIT ${KB_TOP_K}`;
    });
  }

  // Nhánh từ khoá không dấu: trigram trên content_norm (GIN) — word_similarity để câu hỏi ngắn khớp đoạn dài.
  // Ngưỡng `<%` mặc định 0.6 quá chặt với câu hỏi nhiều từ → 0.3 (vẫn dùng GIN trgm), xếp theo word_similarity.
  const kw = await inTx(db, async (tx) => {
    await tx.$executeRaw`SET LOCAL pg_trgm.word_similarity_threshold = 0.3`;
    return tx.$queryRaw<Cand[]>`
    SELECT c.id, word_similarity(f_unaccent(lower(${query})), c.content_norm) AS score
    FROM kb_chunk c JOIN kb_source s ON s.id = c.source_id
    WHERE ${where} AND f_unaccent(lower(${query})) <% c.content_norm
    ORDER BY score DESC, c.id
    LIMIT ${KB_TOP_K}`;
  });

  const top = vec.length ? Number(vec[0]!.score) : 0;
  const kwTop = kw.length ? Number(kw[0]!.score) : 0;
  if (top < min && kwTop < KEYWORD_GROUND) return emptyResult(min, top);

  const fused = rrf([vec.map((r) => r.id), kw.map((r) => r.id)]).slice(0, i.limit ?? KB_CONTEXT);
  // Deferred: nội dung / tên / đường dẫn chỉ cho đúng top-N, kiểm lại vị từ (nguồn có thể vừa đổi giữa hai bước).
  const rows = fused.length
    ? await db.$queryRaw<Row[]>`
        SELECT c.id, c.source_id, s.name AS source_name, c.content, c.meta, s.ingest_seq AS seq
        FROM kb_chunk c JOIN kb_source s ON s.id = c.source_id
        WHERE c.id = ANY(${fused.map((f) => f.id)}::uuid[]) AND ${where}`
    : [];
  const byId = new Map(rows.map((r) => [r.id, r]));
  const chunks = fused.flatMap(({ id, score }) => {
    const r = byId.get(id);
    return r ? [{ chunk_id: r.id, source_id: r.source_id, source_name: r.source_name, content: r.content, path: r.meta?.path ?? [], score, generation: Number(r.seq) }] : [];
  });
  if (!chunks.length) return emptyResult(min, top);
  const refs = [...new Map(rows.map((r) => [r.source_id, { s: r.source_id, g: Number(r.seq) }])).values()];
  return { grounded: true, top_score: top, min_score: min, chunks, citations: chunks.map((c) => ({ source_id: c.source_id, chunk_id: c.chunk_id })), refs };
}
