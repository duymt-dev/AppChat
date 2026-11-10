// Giới hạn kho mô tả action cho tìm theo ngữ nghĩa (TIP-023e §1.1) — dùng chung core (dựng kho) + test, không phải luật tiền/quyền.
export const DISCOVERY_MAX_ACTIONS = 1024;
export const DISCOVERY_DOC_MAX_CHARS = 2000;
export const DISCOVERY_CORPUS_MAX_BYTES = 2 * 1024 * 1024;
/** Tăng khi đổi cách sinh document (ảnh hưởng corpus_hash — generation cũ không còn khớp registry hiện hành). */
export const DISCOVERY_LABEL_VERSION = 1;
/** Tăng khi đổi thuật toán xếp hạng (RRF k, trọng số…) — generation cũ về nội dung vẫn đúng nhưng cách dùng để xếp hạng đã khác. */
export const DISCOVERY_RANKING_VERSION = 1;
export const DISCOVERY_EMBED_DIM = 1536;
