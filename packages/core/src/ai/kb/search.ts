// Tìm kết hợp trong kho tri thức (rag §6–8): top-20 theo vector (cosine, HNSW, `hnsw.iterative_scan` khi có lọc) + top-20 theo từ khoá
// không dấu (`content_norm` trigram) → RRF (k = 60) → top-6. Ngưỡng căn cứ: cosine cao nhất < `min_score` và không đoạn nào khớp từ
// khoá đủ mạnh → `grounded=false`, không trả đoạn (agent không bịa). Đoạn có giá (`meta.volatile`) không bao giờ ra (rag §4).
// Lọc: visibility (agent trả lời khách chỉ `public`), thư mục / thẻ (`kb_scope` của agent — TIP-021), chỉ đoạn cùng `embed_model`.
import { rrf, type Embedder } from '@appchat/ai';
import { TenantSql as Prisma, type TenantDb } from '@appchat/db';

export const KB_TOP_K = 20;
export const KB_CONTEXT = 6;
export const DEFAULT_MIN_SCORE = 0.35;
/** Similarity trigram tối thiểu để một đoạn từ khoá được coi là căn cứ (khi vector chưa đủ ngưỡng). */
const KEYWORD_GROUND = 0.3;

export interface KbSearchInput {
  query: string;
  visibility: readonly ('public' | 'internal')[];
  folderIds?: string[];
  tags?: string[];
  limit?: number;
}

export interface KbHit {
  chunk_id: string;
  source_id: string;
  source_name: string;
  content: string;
  path: string[];
  score: number;
}

export interface KbSearchResult {
  grounded: boolean;
  /** Cosine cao nhất của nhánh vector (0 khi không có). */
  top_score: number;
  min_score: number;
  chunks: KbHit[];
  citations: { source_id: string; chunk_id: string }[];
}

type Raw = Pick<TenantDb, '$queryRaw' | '$executeRaw'>;
type Db = Raw & Pick<TenantDb, 'kbSetting'> & { $transaction?: TenantDb['$transaction'] };

/** `SET LOCAL` chỉ có hiệu lực trong transaction: client thường → mở transaction; đã là transaction (handler) → chạy thẳng. */
const inTx = <T>(db: Db, f: (t: Raw) => Promise<T>): Promise<T> => (typeof db.$transaction === 'function' ? db.$transaction((t) => f(t)) : f(db));

const vecLit = (v: number[]) => `[${v.map((x) => (Number.isFinite(x) ? x.toFixed(6) : '0')).join(',')}]`;

function filters(i: KbSearchInput): Prisma.Sql {
  const parts: Prisma.Sql[] = [
    Prisma.sql`s.deleted_at IS NULL`,
    Prisma.sql`s.status = 'ready'`,
    Prisma.sql`s.visibility::text IN (${Prisma.join([...i.visibility])})`,
    Prisma.sql`coalesce((c.meta->>'volatile')::boolean, false) = false`,
  ];
  const folders = i.folderIds?.length ? i.folderIds : null;
  const tags = i.tags?.length ? i.tags : null;
  // kb_scope = thư mục HOẶC thẻ (rag §2): tài liệu thuộc một thư mục đã chọn, hoặc có một thẻ đã chọn.
  if (folders && tags) parts.push(Prisma.sql`(s.folder_id::text IN (${Prisma.join(folders)}) OR s.tags && ${tags}::text[])`);
  else if (folders) parts.push(Prisma.sql`s.folder_id::text IN (${Prisma.join(folders)})`);
  else if (tags) parts.push(Prisma.sql`s.tags && ${tags}::text[]`);
  return Prisma.join(parts, ' AND ');
}

interface Row {
  id: string;
  source_id: string;
  source_name: string;
  content: string;
  meta: { path?: string[] } | null;
  score: number;
}

export async function minScoreOf(db: Pick<TenantDb, 'kbSetting'>): Promise<number> {
  return (await db.kbSetting.findUnique({ where: { id: 1 } }))?.minScore ?? DEFAULT_MIN_SCORE;
}

export async function searchKb(db: Db, embedder: Embedder | null, i: KbSearchInput): Promise<KbSearchResult> {
  const query = i.query.trim();
  const min = await minScoreOf(db);
  const empty: KbSearchResult = { grounded: false, top_score: 0, min_score: min, chunks: [], citations: [] };
  if (!query || !i.visibility.length) return empty;
  const where = filters(i);

  // Nhánh vector: embed câu hỏi bằng cùng router; so đúng các đoạn cùng embed_model (đổi model → job re-embed — rag §10).
  let vec: Row[] = [];
  if (embedder) {
    const e = await embedder.embed([query]);
    const q = vecLit(e.vectors[0]!);
    vec = await inTx(db, async (tx) => {
      await tx.$executeRaw`SET LOCAL hnsw.iterative_scan = relaxed_order`;
      return tx.$queryRaw<Row[]>`
        SELECT c.id, c.source_id, s.name AS source_name, c.content, c.meta, 1 - (c.embedding <=> ${q}::vector) AS score
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
    return tx.$queryRaw<Row[]>`
    SELECT c.id, c.source_id, s.name AS source_name, c.content, c.meta, word_similarity(f_unaccent(lower(${query})), c.content_norm) AS score
    FROM kb_chunk c JOIN kb_source s ON s.id = c.source_id
    WHERE ${where} AND f_unaccent(lower(${query})) <% c.content_norm
    ORDER BY score DESC, c.id
    LIMIT ${KB_TOP_K}`;
  });

  const top = vec.length ? Number(vec[0]!.score) : 0;
  const kwTop = kw.length ? Number(kw[0]!.score) : 0;
  if (top < min && kwTop < KEYWORD_GROUND) return { ...empty, top_score: top };

  const rows = new Map([...kw, ...vec].map((r) => [r.id, r]));
  const fused = rrf([vec.map((r) => r.id), kw.map((r) => r.id)]).slice(0, i.limit ?? KB_CONTEXT);
  const chunks = fused.map(({ id, score }) => {
    const r = rows.get(id)!;
    return { chunk_id: r.id, source_id: r.source_id, source_name: r.source_name, content: r.content, path: r.meta?.path ?? [], score };
  });
  return { grounded: true, top_score: top, min_score: min, chunks, citations: chunks.map((c) => ({ source_id: c.source_id, chunk_id: c.chunk_id })) };
}
