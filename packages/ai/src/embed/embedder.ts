// Embedding qua router (rag §10, D33): ứng viên purpose `embed` theo `model_route.priority` (mức standard — embed không phân mức),
// `embedMany` theo lô, 5xx / 429 / timeout → ứng viên kế. Trả vector + token đầu vào để core trừ credit theo `model_price`. Có `hooks`
// (TIP-019b) → mỗi lô một lần gọi đo được: `maxRetries: 0`, lỗi không rõ đã chạy chưa → không chuyển ứng viên, không gửi lại.
import { embedMany } from 'ai';
import { isFallbackError } from '../router/router';
import { EngineError } from '../gateway/engine';
import { classifyAttemptError } from '../gateway/attempts';
import type { ModelSource } from '../gateway/types';
import type { EmbedHooks } from './attempts';

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
  embed(values: string[], signal?: AbortSignal, hooks?: EmbedHooks): Promise<EmbedResult>;
}

export class AiSdkEmbedder implements Embedder {
  constructor(private readonly models: ModelSource) {}

  async embed(values: string[], signal?: AbortSignal, hooks?: EmbedHooks): Promise<EmbedResult> {
    const candidates = await this.models.candidates('standard', 'embed', { tools: false });
    if (!candidates.length) throw new EngineError('NO_MODEL_ROUTE', 'Chưa có model embedding');
    if (hooks) return this.metered(candidates, values, hooks, signal);
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

  private async metered(candidates: Awaited<ReturnType<ModelSource['candidates']>>, values: string[], hooks: EmbedHooks, signal?: AbortSignal): Promise<EmbedResult> {
    let last: unknown;
    for (let ci = 0; ci < candidates.length; ci++) {
      const c = candidates[ci]!;
      const vectors: number[][] = [];
      let tokens = 0;
      let fallback = false;
      for (let i = 0, batch = 0; i < values.length; i += BATCH, batch++) {
        const a = { candidate: ci, batch, provider: c.provider, model: c.model };
        await hooks.before(a);
        const t0 = Date.now();
        let r: Awaited<ReturnType<typeof embedMany>>;
        try {
          r = await embedMany({ model: c.handle as never, values: values.slice(i, i + BATCH), maxRetries: 0, ...(signal ? { abortSignal: signal } : {}) });
        } catch (err) {
          const k = classifyAttemptError(err, false, signal?.aborted ?? false);
          await hooks.after(a, { kind: k.kind, error: k.error, latencyMs: Date.now() - t0 });
          if (k.kind === 'unknown') throw Object.assign(new EngineError('USAGE_UNKNOWN', 'Lời gọi embedding chưa rõ kết quả — không gửi lại'), { cause: err });
          if (!k.fallback) throw err;
          last = err;
          fallback = true;
          break;
        }
        // Thiếu usage ≠ usage 0 (SDK điền NaN khi nhà cung cấp không trả): không rõ → cách ly, không coi là miễn phí.
        if (!Number.isFinite(r.usage?.tokens)) {
          await hooks.after(a, { kind: 'unknown', error: 'no_usage', latencyMs: Date.now() - t0 });
          throw new EngineError('USAGE_UNKNOWN', 'Nhà cung cấp embedding không trả usage');
        }
        await hooks.after(a, { kind: 'usage', tokensIn: r.usage.tokens, tokensOut: 0, latencyMs: Date.now() - t0 });
        for (const v of r.embeddings) {
          if (v.length !== EMBED_DIM) throw new EngineError('EMBED_DIM_MISMATCH', `${c.provider}:${c.model} trả ${v.length} chiều, cần ${EMBED_DIM}`);
          vectors.push(v);
        }
        tokens += r.usage.tokens;
      }
      if (!fallback) return { vectors, provider: c.provider, model: c.model, tokens };
    }
    throw last;
  }
}
