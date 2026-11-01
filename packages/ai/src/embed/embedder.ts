// Embedding qua router (rag §10, D33): ứng viên purpose `embed` theo `model_route.priority` (mức standard — embed không phân mức),
// `embedMany` theo lô, 5xx / 429 / timeout → ứng viên kế. Trả vector + token đầu vào để core trừ credit theo `model_price`.
import { embedMany } from 'ai';
import { isFallbackError } from '../router/router';
import { EngineError } from '../gateway/engine';
import type { ModelSource } from '../gateway/types';

/** Số chiều cố định của `kb_chunk.embedding` (vector(1536)). */
export const EMBED_DIM = 1536;
const BATCH = 64;

export interface EmbedResult {
  vectors: number[][];
  provider: string;
  model: string;
  tokens: number;
}

export interface Embedder {
  embed(values: string[], signal?: AbortSignal): Promise<EmbedResult>;
}

export class AiSdkEmbedder implements Embedder {
  constructor(private readonly models: ModelSource) {}

  async embed(values: string[], signal?: AbortSignal): Promise<EmbedResult> {
    const candidates = await this.models.candidates('standard', 'embed', { tools: false });
    if (!candidates.length) throw new EngineError('NO_MODEL_ROUTE', 'Chưa có model embedding');
    let last: unknown;
    for (const c of candidates) {
      try {
        const vectors: number[][] = [];
        let tokens = 0;
        for (let i = 0; i < values.length; i += BATCH) {
          const r = await embedMany({ model: c.handle as never, values: values.slice(i, i + BATCH), maxRetries: 1, ...(signal ? { abortSignal: signal } : {}) });
          for (const v of r.embeddings) {
            if (v.length !== EMBED_DIM) throw new EngineError('EMBED_DIM_MISMATCH', `${c.provider}:${c.model} trả ${v.length} chiều, cần ${EMBED_DIM}`);
            vectors.push(v);
          }
          tokens += r.usage?.tokens ?? 0;
        }
        return { vectors, provider: c.provider, model: c.model, tokens };
      } catch (err) {
        last = err;
        if (signal?.aborted || !isFallbackError(err)) throw err;
      }
    }
    throw last;
  }
}
