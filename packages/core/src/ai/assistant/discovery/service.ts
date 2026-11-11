// Dịch vụ tìm action theo ngữ nghĩa — hợp nhất với từ khoá (TIP-023e §2): điểm nối giữa corpus/generation (§1) và meta-tools
// `find_actions` (§4, CHƯA wiring ở đây — service này độc lập, tự kiểm được bằng unit test, không cần boot Nest/DB thật). Luôn trả
// kết quả ĐÃ LỌC QUYỀN HIỆN HÀNH (authority.ts) — vector/keyword chỉ là ứng viên, không bao giờ là quyền. Thiếu route embed / chưa
// có generation `ready` cho corpus+space hiện hành → honest keyword fallback (không gọi vector, không giả lập điểm ngữ nghĩa).
import { registry } from '@appchat/actions';
import { foldText, type AuthzContext } from '@appchat/shared';
import { briefSchema, findActions, type AssistantMode, type FoundAction, type Implemented } from '../catalog';
import { buildCorpus } from './corpus';
import { findGeneration } from './generation';
import { filterAuthorized, type Admit } from './authority';
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
const BY_ID = new Map(registry.map((a) => [a.id, a]));
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
  /** TIP-021b: lọc mục đích thêm (vd. chỉ action cấp được cho agent) — áp TRƯỚC rank / limit ở cả nhánh từ khoá lẫn vector. */
  admit?: Admit;
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

/**
 * Từ khoá cho câu hỏi dài (TIP-021b): mỗi từ (không dấu, ≥ 2 ký tự) khớp văn bản corpus 023e (id + mô tả + nhãn vi/en) cộng trọng số
 * IDF; chỉ action còn được phép (quyền + chế độ + handler + mục đích); điểm giảm dần, hoà theo id. Không mở rộng câu hỏi bằng model.
 */
function purposeKeywordIds(i: DiscoveryQueryInput): string[] {
  // Khớp NGUYÊN từ (không chuỗi con — "cu" không khớp "cuoc") + cụm hai từ liền kề ("tao ticket", "lich hen") — tiếng Việt là âm tiết
  // nên cụm mới mang nghĩa (cụm nặng gấp đôi). Không chuẩn hoá độ dài: action đúng nghĩa thường có mô tả dài hơn.
  const tokens = (t: string) => foldText(t).split(/[^a-z0-9_]+/).filter((w) => w.length > 1);
  const grams = (ws: string[]) => ws.slice(1).map((w, k) => `${ws[k]} ${w}`);
  const q = tokens(i.query);
  const terms = [...new Set([...q, ...grams(q)])];
  if (!terms.length) return [];
  const docs = buildCorpus(i.implemented).docs.map((d) => {
    // Ví dụ JSON trong mô tả là nhiễu từ khoá (tên khách, mã mẫu) — bỏ trước khi đếm.
    const ws = tokens(d.text.replace(/Example:\s*\{[^}]*\}/g, ' '));
    return { id: d.actionId, set: new Set([...ws, ...grams(ws)]) };
  });
  const df = new Map(terms.map((w) => [w, docs.filter((d) => d.set.has(w)).length]));
  const allowed = new Set(filterAuthorized(docs.map((d) => d.id), i.authz, i.mode, i.implemented, i.module, i.admit).map((a) => a.id));
  return docs
    .filter((d) => allowed.has(d.id))
    .map((d) => {
      const raw = terms.reduce((t, w) => (d.set.has(w) ? t + Math.log((docs.length + 1) / (df.get(w)! + 0.5)) * (w.includes(' ') ? 2 : 1) : t), 0);
      return { id: d.id, score: raw };
    })
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score || x.id.localeCompare(y.id))
    .slice(0, KEYWORD_TOP)
    .map((x) => x.id);
}

/** Tìm action theo ngữ nghĩa + từ khoá, luôn trả kết quả đã lọc quyền hiện hành. Không có generation `ready` khớp corpus+space
 *  hiện hành (chưa build / đang build / build lỗi) → honest keyword fallback, discovery.strategy = 'keyword' hoặc 'none'. */
export async function discoverActions(d: DiscoveryDeps, i: DiscoveryQueryInput): Promise<DiscoveryResult> {
  // Có bộ lọc mục đích (soạn agent — câu hỏi là cả đoạn mô tả): xếp hạng từ khoá IDF trên văn bản corpus, lọc quyền + mục đích TRƯỚC
  // khi cắt top. Không có: `findActions` cũ (câu ngắn của model).
  const keywordIds = i.admit ? purposeKeywordIds(i) : findActions(i.authz, i.mode, i.query, i.module, KEYWORD_TOP, i.implemented).map((a) => a.id);
  // exactId chỉ khi qua bộ lọc mục đích (không đưa action bị loại lên đầu); vector chỉ trong allowedIds (đã lọc `admit` bên dưới).
  const exact = exactIdOf(i.query);
  const exactId = exact && (!i.admit || i.admit(BY_ID.get(exact)!)) ? exact : undefined;

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
  const allowedIds = filterAuthorized(registry.map((a) => a.id), i.authz, i.mode, i.implemented, i.module, i.admit).map((a) => a.id);
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
