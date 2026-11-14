// Kiểu dùng chung cho kho mô tả action theo ngữ nghĩa (TIP-023e §1) — tách riêng để corpus.ts / service.ts / authority.ts / cache.ts
// không vòng import nhau.

/** Một action đã chuẩn hoá thành văn bản tìm được (§1.1) — không business data, chỉ metadata registry. */
export interface DiscoveryDoc {
  actionId: string;
  /** Văn bản đã ghép (id + mô tả + nhãn vi/en + module/risk), cắt tối đa DISCOVERY_DOC_MAX_CHARS. */
  text: string;
  /** sha256 của `text` — phát hiện đổi ngầm giữa các lần build cùng corpus_hash (không nên xảy ra, nhưng kiểm cho chắc). */
  documentHash: string;
  /** sha256 của input JSON Schema (023b canonical) — đổi khuôn input cũng phải đổi corpus (dù mô tả giữ nguyên). */
  schemaHash: string;
}

export interface DiscoveryCorpus {
  docs: DiscoveryDoc[];
  /** sha256 của (id đã sắp + hash document + hash schema + label version + ranking version) — §1.2. */
  corpusHash: string;
}

/** Không gian embedding đã ghim cho một generation (§1.2, §1.6) — provider/model/dimension/configRevision của ROUTE đang dùng. */
export interface EmbeddingSpace {
  provider: string;
  model: string;
  dimension: number;
  /** Thế hệ cấu hình opaque của route embed (TIP-023e §1.2, `ai/router/config-revision.ts`) — đổi provider/route cũng đổi không gian. */
  configRevision: string;
}

/** Khoá chuỗi để lưu/so sánh (UNIQUE(corpus_hash, embedding_space) ở schema). */
export const embeddingSpaceKey = (s: EmbeddingSpace): string => `${s.provider}:${s.model}:${s.dimension}:${s.configRevision}`;
