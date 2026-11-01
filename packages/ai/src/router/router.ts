// LLM Router (Blueprint §5.1, agent-gateway §12): `model_route` theo mức AI + mục đích, ưu tiên tăng dần; chỉ provider `active`
// + có key + đủ khả năng (agent có tool → `tools`; embed → `embeddings`). Engine thử lần lượt, lỗi 5xx / 429 / timeout → kế tiếp.
import type { AiTier, ModelCandidate, ModelPurpose, ModelSource } from '../gateway/types';
import { buildModel, type ProviderConfig } from './providers';

export interface RouteRow {
  tier: AiTier;
  purpose: ModelPurpose;
  priority: number;
  providerKey: string;
  model: string;
}

/** Nguồn cấu hình (core đọc DB nền tảng, cache 60 giây). */
export interface RouterConfigSource {
  routes(tier: AiTier, purpose: ModelPurpose): Promise<RouteRow[]>;
  /** Provider `active` + đã giải key; null = tắt / thiếu key. */
  provider(key: string): Promise<ProviderConfig | null>;
}

export class LlmRouter implements ModelSource {
  private readonly built = new Map<string, unknown>();

  constructor(
    private readonly config: RouterConfigSource,
    private readonly build: typeof buildModel = buildModel,
  ) {}

  async candidates(tier: AiTier, purpose: ModelPurpose, needs: { tools: boolean }): Promise<ModelCandidate[]> {
    const routes = [...(await this.config.routes(tier, purpose))].sort((a, b) => a.priority - b.priority);
    const out: ModelCandidate[] = [];
    for (const r of routes) {
      const p = await this.config.provider(r.providerKey);
      if (!p) continue;
      if (purpose === 'chat' && needs.tools && p.capabilities.tools === false) continue;
      if (purpose === 'embed' && !p.capabilities.embeddings) continue;
      const k = `${p.key}\u0000${r.model}\u0000${purpose}\u0000${p.apiKey.length}`;
      let handle = this.built.get(k);
      if (!handle) {
        handle = this.build(p, r.model, purpose);
        this.built.set(k, handle);
      }
      out.push({ provider: p.key, model: r.model, handle });
    }
    return out;
  }

  /** Cấu hình provider đổi (Quản trị nền tảng) → bỏ model đã dựng. */
  reset(): void {
    this.built.clear();
  }
}

/** Lỗi đáng chuyển provider: 5xx, 429, timeout / mạng. Lỗi 4xx khác (key sai, prompt sai) không thử tiếp. */
export function isFallbackError(err: unknown): boolean {
  const e = err as { statusCode?: number; isRetryable?: boolean; name?: string; code?: string; cause?: unknown };
  if (!e || typeof e !== 'object') return false;
  if (typeof e.statusCode === 'number') return e.statusCode >= 500 || e.statusCode === 429 || e.statusCode === 408;
  if (e.name === 'TimeoutError' || e.name === 'AbortError' || e.code === 'ETIMEDOUT' || e.code === 'ECONNRESET' || e.code === 'ECONNREFUSED' || e.code === 'ENOTFOUND') return true;
  if (e.isRetryable) return true;
  return e.cause ? isFallbackError(e.cause) : false;
}
