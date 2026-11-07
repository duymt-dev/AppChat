// Embedding giả tất định (Q-001 — chưa có key): băm từng từ đã bỏ dấu vào 1536 chiều rồi chuẩn hoá → câu chung từ có cosine cao.
// Đủ để chạy hybrid search thật (HNSW + ngưỡng căn cứ) ở test / dev / E2E; không mang nghĩa ngữ nghĩa như model thật.
import { MockEmbeddingModelV4 } from 'ai/test';
import { EMBED_DIM } from '../embed/embedder';
import { staticModelSource } from './mock-model';

export const MOCK_EMBED_MODEL = 'mock-embed';

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase();

function hash(word: string): number {
  let h = 2166136261;
  for (let i = 0; i < word.length; i++) h = Math.imul(h ^ word.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Vector túi-từ băm (không dấu, bỏ từ 1 ký tự); câu rỗng → vector đơn vị cố định. */
export function mockVector(text: string): number[] {
  const v = new Array<number>(EMBED_DIM).fill(0);
  for (const w of fold(text).split(/[^a-z0-9]+/)) if (w.length > 1) v[hash(w) % EMBED_DIM]! += 1;
  const n = Math.hypot(...v);
  if (!n) {
    v[0] = 1;
    return v;
  }
  return v.map((x) => x / n);
}

/** `tokensPerCall` (test đo usage): mỗi lô báo đúng số token này; `onCall` đếm lời gọi thật. */
export function mockEmbeddingModel(provider = 'mock', o: { tokensPerCall?: number; onCall?: () => void } = {}) {
  return new MockEmbeddingModelV4({
    provider,
    modelId: MOCK_EMBED_MODEL,
    maxEmbeddingsPerCall: 64,
    doEmbed: async ({ values }) => {
      o.onCall?.();
      return {
        embeddings: values.map((x) => mockVector(String(x))),
        usage: { tokens: o.tokensPerCall ?? values.reduce((s, x) => s + Math.ceil(String(x).length / 4), 0) },
        warnings: [],
      };
    },
  });
}

/** Nguồn model embed giả một ứng viên (test / `AI_ENGINE=mock`). */
export const mockEmbedSource = (provider = 'mock', o: { tokensPerCall?: number; onCall?: () => void } = {}) => staticModelSource([{ provider, model: MOCK_EMBED_MODEL, handle: mockEmbeddingModel(provider, o) }]);
