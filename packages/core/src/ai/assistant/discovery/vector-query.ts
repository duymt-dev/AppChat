// Top-N theo cosine trên tập action_id ĐÃ CHO TRƯỚC (TIP-023e §2.3): "Fetch generation+authorized IDs before rank/limit, no top8
// global then filter" — tập action_id truyền vào đây PHẢI là tập đã lọc quyền hiện hành (authority.ts) trước, không phải toàn bộ
// registry. "exact cosine ranking over ≤1024 authorized vectors is acceptable and avoids ANN post-filter starvation" — không dùng
// HNSW/ivfflat ở đây (index đó tối ưu cho top-K KHÔNG lọc trước; lọc trước rồi mới cosine trên tập nhỏ không cần index).
import { TenantSql as Prisma, type TenantDb } from '@appchat/db';

const vecLit = (v: number[]) => `[${v.map((x) => (Number.isFinite(x) ? x.toFixed(6) : '0')).join(',')}]`;

type Db = Pick<TenantDb, '$queryRaw'>;

interface Row {
  action_id: string;
  score: number;
}

/** Top `limit` action_id của generation `ready` theo cosine với `queryVector`, CHỈ trong `allowedIds` (đã lọc quyền trước — §2.3).
 *  `allowedIds` rỗng → trả rỗng ngay, không truy vấn (tránh `IN ()` SQL vô nghĩa). */
export async function vectorTopK(db: Db, generationId: string, queryVector: number[], allowedIds: readonly string[], limit: number): Promise<string[]> {
  if (!allowedIds.length) return [];
  const q = vecLit(queryVector);
  const rows = await db.$queryRaw<Row[]>`
    SELECT action_id, 1 - (embedding <=> ${q}::vector) AS score
    FROM action_discovery_document
    WHERE generation_id = ${generationId}::uuid AND action_id IN (${Prisma.join([...allowedIds])}) AND embedding IS NOT NULL
    ORDER BY embedding <=> ${q}::vector, action_id
    LIMIT ${limit}`;
  return rows.map((r) => r.action_id);
}
