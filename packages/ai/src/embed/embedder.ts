// Embedding qua router (rag §10, D33): ứng viên purpose `embed` theo `model_route.priority` (mức standard — embed không phân mức),
// `embedMany` theo lô, 5xx / 429 / timeout → ứng viên kế. Trả vector + token đầu vào để core trừ credit theo `model_price`. Có `hooks`
// (TIP-019b) → mỗi lô một lần gọi đo được: `maxRetries: 0`, lỗi không rõ đã chạy chưa → không chuyển ứng viên, không gửi lại.
// TIP-020e: không gian embedding = `provider:model:1536:<thế hệ route>` (023e). Ghim `space` → chỉ đúng ứng viên đó, KHÔNG rơi sang model
// khác khi lỗi (vector khác không gian không bao giờ được so với kho); không còn ứng viên của space → EMBED_SPACE_RETIRED, không gọi mạng.
import { embedMany } from 'ai';
import { isFallbackError } from '../router/router';
import { EngineError } from '../gateway/engine';
import { classifyAttemptError } from '../gateway/attempts';
import type { ModelCandidate, ModelSource } from '../gateway/types';
import type { EmbedHooks } from './attempts';

/** Số chiều cố định của `kb_chunk.embedding` (vector(1536)). */
export const EMBED_DIM = 1536;
const BATCH = 64;

export interface EmbedResult {
  vectors: number[][];
  provider: string;
  model: string;
  tokens: number;
  /** Không gian của ứng viên đã dùng (`embedSpaceKey`) — vắng ở embedder giả cũ (core lùi về `provider:model:1536:`). */
  space?: string;
}

/** Không gian embedding của một ứng viên hiện hành (chỉ đọc cấu hình, không gọi provider). */
export interface EmbedSpace {
  key: string;
  provider: string;
  model: string;
}

export interface Embedder {
  /** `space`: ghim đúng không gian này (không fallback chéo space) — vắng = ứng viên theo priority như cũ. */
  embed(values: string[], signal?: AbortSignal, hooks?: EmbedHooks, space?: string): Promise<EmbedResult>;
  /** Không gian của ứng viên ưu tiên cao nhất hiện hành; null = chưa có route embed. Vắng = embedder giả không biết cấu hình. */
  space?(): Promise<EmbedSpace | null>;
  /** Space còn ứng viên dùng được (chỉ đọc cấu hình) — false = route của space đã gỡ (nhánh vector tắt, không gọi mạng). */
  has?(space: string): Promise<boolean>;
}

/** Khoá không gian: `provider:model:1536:<thế hệ route>` (023e §1.2 — chỉ nửa route; xoay key / probe provider không đổi vector). */
export const embedSpaceKey = (c: Pick<ModelCandidate, 'provider' | 'model' | 'routeRevision'>): string => `${c.provider}:${c.model}:${EMBED_DIM}:${c.routeRevision ?? ''}`;

/** Space ghi trước TIP-020e chỉ biết `provider:model` (thế hệ route trống): khớp ứng viên cùng provider + model — đúng ngữ nghĩa lọc
 *  `embed_model` cũ (không nới hơn). Space đầy đủ: khớp nguyên văn. */
export function spaceMatches(space: string, candidateKey: string): boolean {
  if (space === candidateKey) return true;
  return space.endsWith(`:${EMBED_DIM}:`) && candidateKey.startsWith(space);
}

/** Vector hợp lệ: đúng số chiều, mọi phần tử hữu hạn (NaN / Infinity làm hỏng cosine — từ chối, không ghi). */
const validVector = (v: number[]): boolean => v.length === EMBED_DIM && v.every(Number.isFinite);

function checkVector(c: ModelCandidate, v: number[]): void {
  if (v.length !== EMBED_DIM) throw new EngineError('EMBED_DIM_MISMATCH', `${c.provider}:${c.model} trả ${v.length} chiều, cần ${EMBED_DIM}`);
  if (!validVector(v)) throw new EngineError('EMBED_VECTOR_INVALID', `${c.provider}:${c.model} trả vector không hữu hạn`);
}

export class AiSdkEmbedder implements Embedder {
  constructor(private readonly models: ModelSource) {}

  async space(): Promise<EmbedSpace | null> {
    const [top] = await this.models.candidates('standard', 'embed', { tools: false });
    return top ? { key: embedSpaceKey(top), provider: top.provider, model: top.model } : null;
  }

  async has(space: string): Promise<boolean> {
    return (await this.models.candidates('standard', 'embed', { tools: false })).some((c) => spaceMatches(space, embedSpaceKey(c)));
  }

  async embed(values: string[], signal?: AbortSignal, hooks?: EmbedHooks, space?: string): Promise<EmbedResult> {
    const all = await this.models.candidates('standard', 'embed', { tools: false });
    if (!all.length) throw new EngineError('NO_MODEL_ROUTE', 'Chưa có model embedding');
    // Ghim: đúng MỘT ứng viên của space (hoặc không có) — danh sách một phần tử nên vòng fallback dưới không thể sang model khác.
    const candidates = space === undefined ? all : all.filter((c) => spaceMatches(space, embedSpaceKey(c))).slice(0, 1);
    if (!candidates.length) throw new EngineError('EMBED_SPACE_RETIRED', 'Không gian embedding của kho không còn route');
    if (hooks) return this.metered(candidates, values, hooks, signal);
    let last: unknown;
    for (const c of candidates) {
      try {
        const vectors: number[][] = [];
        let tokens = 0;
        for (let i = 0; i < values.length; i += BATCH) {
          const r = await embedMany({ model: c.handle as never, values: values.slice(i, i + BATCH), maxRetries: 1, ...(signal ? { abortSignal: signal } : {}) });
          for (const v of r.embeddings) {
            checkVector(c, v);
            vectors.push(v);
          }
          tokens += r.usage?.tokens ?? 0;
        }
        return { vectors, provider: c.provider, model: c.model, tokens, space: embedSpaceKey(c) };
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
          checkVector(c, v);
          vectors.push(v);
        }
        tokens += r.usage.tokens;
      }
      if (!fallback) return { vectors, provider: c.provider, model: c.model, tokens, space: embedSpaceKey(c) };
    }
    throw last;
  }
}
