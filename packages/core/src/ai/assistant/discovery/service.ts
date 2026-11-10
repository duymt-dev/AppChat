// Dịch vụ tìm action theo ngữ nghĩa — hợp nhất với từ khoá (TIP-023e §2): điểm nối giữa corpus/generation (§1) và meta-tools
// `find_actions` (§4, CHƯA wiring ở đây — service này độc lập, tự kiểm được bằng unit test, không cần boot Nest/DB thật). Luôn trả
// kết quả ĐÃ LỌC QUYỀN HIỆN HÀNH (authority.ts) — vector/keyword chỉ là ứng viên, không bao giờ là quyền. Thiếu route embed / chưa
// có generation `ready` cho corpus+space hiện hành → honest keyword fallback (không gọi vector, không giả lập điểm ngữ nghĩa).
import { registry } from '@appchat/actions';
import type { AuthzContext } from '@appchat/shared';
import { briefSchema, findActions, type AssistantMode, type FoundAction, type Implemented } from '../catalog';
import { buildCorpus } from './corpus';
import { findGeneration } from './generation';
import { filterAuthorized } from './authority';
import { rankAndAuthorize } from './ranking';
import { vectorTopK } from './vector-query';
import { embeddingSpaceKey, type EmbeddingSpace } from './types';
import type { DiscoveryCache } from './cache';

export type DiscoveryStrategy = 'hybrid' | 'keyword' | 'none';

/** Lý do honest khi KHÔNG dùng được nhánh vector (§4.2) — không bao giờ gắn `strategy: 'hybrid'` khi một trong các lý do này xảy ra. */
export type FallbackReason = 'no_model_route' | 'corpus_not_ready' | 'corpus_building' | 'corpus_failed' | 'corpus_unknown' | 'provider_unavailable';

export interface DiscoveryMeta {
  strategy: DiscoveryStrategy;
  reason?: FallbackReason;
  corpus_version: string | null;
  cache_hit: boolean;
}

export interface DiscoveryResult {
  actions: FoundAction[];
  discovery: DiscoveryMeta;
}

export type QueryVector = (query: string) => Promise<number[] | null>;

const VECTOR_TOP = 20;
const KEYWORD_TOP = 20;

/** Action_id hợp lệ format `module.verb` tồn tại trong registry — câu hỏi gõ đúng id (§2.3 "an exact permitted action ID ranks first"). */
const exactIdOf = (query: string): string | undefined => {
  const q = query.trim();
  return /^[a-z_]+\.[a-z_]+$/.test(q) && registry.some((a) => a.id === q) ? q : undefined;
};

/** Danh sách FoundAction đúng khuôn trả về của `find_actions` (schema HIỆN HÀNH, không copy cũ từ cache/vector row — §2.3). */
function projectFound(ids: readonly string[]): FoundAction[] {
  const byId = new Map(registry.map((a) => [a.id, a]));
  return ids.map((id) => {
    const a = byId.get(id)!;
    return { id: a.id, module: a.module, risk: a.risk, description: a.description, input: briefSchema(a) };
  });
}

export interface DiscoveryQueryInput {
  authz: AuthzContext;
  mode: AssistantMode;
  query: string;
  module?: string;
  limit: number;
  implemented: Implemented;
}

export interface DiscoveryDeps {
  db: Parameters<typeof findGeneration>[0] & Parameters<typeof vectorTopK>[0];
  /** Không gian embedding hiện hành đã ghim (null khi chưa cấu hình route embed) — caller tự resolve (embedding-space.ts),
   *  service không gọi provider để tự dò (tránh mỗi truy vấn đều thử resolve lại không cần thiết khi caller đã biết). */
  space: EmbeddingSpace | null;
  /** Embed câu hỏi (đã đo/metered ở tầng gọi — service này không biết gì về run/credit, chỉ nhận vector). Trả `null` = không embed
   *  được (lỗi provider đã được caller phân loại là an toàn để fallback, vd. `provider_unavailable`) — KHÔNG throw vào đây cho lỗi
   *  cứng (budget/privacy/usage-unknown) — những lỗi đó phải dừng lượt ở tầng gọi, không được nuốt thành "keyword honest". */
  queryVector: QueryVector | null;
  /** Cache riêng theo gốc run (§3) — vắng / không rõ gốc → luôn đường không cache. */
  cache?: { store: DiscoveryCache; ws: string; rootRunId: string; userId: string } | null;
}

/** Tìm action theo ngữ nghĩa + từ khoá, luôn trả kết quả đã lọc quyền hiện hành. Không có generation `ready` khớp corpus+space
 *  hiện hành (chưa build / đang build / build lỗi) → honest keyword fallback, discovery.strategy = 'keyword' hoặc 'none'. */
export async function discoverActions(d: DiscoveryDeps, i: DiscoveryQueryInput): Promise<DiscoveryResult> {
  const keywordIds = findActions(i.authz, i.mode, i.query, i.module, KEYWORD_TOP, i.implemented).map((a) => a.id);
  const exactId = exactIdOf(i.query);

  const fallback = (reason: FallbackReason): DiscoveryResult => {
    const ranked = rankAndAuthorize({ vectorIds: [], keywordIds, exactId, authz: i.authz, mode: i.mode, implemented: i.implemented, module: i.module, limit: i.limit });
    return { actions: projectFound(ranked.map((r) => r.id)), discovery: { strategy: ranked.length ? 'keyword' : 'none', reason, corpus_version: null, cache_hit: false } };
  };

  if (!d.space || !d.queryVector) return fallback('no_model_route');

  const corpus = buildCorpus(i.implemented);
  const gen = await findGeneration(d.db, corpus.corpusHash, d.space);
  if (!gen) return fallback('corpus_not_ready');
  if (gen.phase === 'building' || gen.phase === 'unknown') return fallback('corpus_building');
  if (gen.phase === 'failed') return fallback('corpus_failed');

  // Ứng viên vector CHỈ trong tập đã lọc quyền hiện hành (§2.2-§2.3 "Fetch generation+authorized IDs before rank/limit") — không
  // top-K toàn cục rồi lọc sau (lọc sau sẽ làm đói kết quả khi top-K toàn cục trùng nhiều action người dùng không được gọi).
  const allowedIds = filterAuthorized(registry.map((a) => a.id), i.authz, i.mode, i.implemented, i.module).map((a) => a.id);
  const scope = d.cache ? { ws: d.cache.ws, rootRunId: d.cache.rootRunId, userId: d.cache.userId, corpusHash: corpus.corpusHash, spaceKey: embeddingSpaceKey(d.space), module: i.module, allowedIds, query: i.query } : null;
  const cached = scope ? await d.cache!.store.get(scope) : null;
  let vectorIds = cached;
  if (!vectorIds) {
    const vector = await d.queryVector(i.query);
    if (!vector) return fallback('provider_unavailable');
    vectorIds = await vectorTopK(d.db, gen.id, vector, allowedIds, VECTOR_TOP);
    if (scope) await d.cache!.store.set(scope, vectorIds);
  }

  const ranked = rankAndAuthorize({ vectorIds, keywordIds, exactId, authz: i.authz, mode: i.mode, implemented: i.implemented, module: i.module, limit: i.limit });
  return { actions: projectFound(ranked.map((r) => r.id)), discovery: { strategy: ranked.length ? 'hybrid' : 'none', corpus_version: corpus.corpusHash, cache_hit: !!cached } };
}
