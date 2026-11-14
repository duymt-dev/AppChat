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
  /** Thế hệ cấu hình opaque của route (TIP-023e §1.2) — vắng ở test cũ, router lùi về khoá theo priority/model. */
  configRevision?: string;
  /** Thế hệ không gian embedding (TIP-020e): chỉ model + params — lưu lại nhóm / đổi priority không đổi; vắng → lùi về `configRevision`. */
  spaceRevision?: string;
  /** Route đọc được ảnh (TIP-023f §3.2) — khai rõ ở `model_route.params.vision` cho ĐÚNG model đó; vắng = không (fail closed). */
  vision?: boolean;
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

  async candidates(tier: AiTier, purpose: ModelPurpose, needs: { tools: boolean; vision?: boolean; structured?: boolean }): Promise<ModelCandidate[]> {
    const routes = [...(await this.config.routes(tier, purpose))].sort((a, b) => a.priority - b.priority);
    const out: ModelCandidate[] = [];
    for (const r of routes) {
      const p = await this.config.provider(r.providerKey);
      if (!p) continue;
      if (purpose === 'chat' && needs.tools && p.capabilities.tools === false) continue;
      // Sinh theo schema (TIP-021b): chỉ provider đã khai / probe `json_schema` — vắng = chưa kiểm → không chọn (fail closed).
      if (purpose === 'chat' && needs.structured && !p.capabilities.json_schema) continue;
      if (purpose === 'embed' && !p.capabilities.embeddings) continue;
      // Rerank (TIP-020e §3.1): chỉ provider khai `rerank`; dựng lỗi RERANK_UNSUPPORTED (kind không có reranking model) → bỏ ứng viên.
      if (purpose === 'rerank' && !p.capabilities.rerank) continue;
      // Ảnh trong tin: chỉ route khai vision cho đúng model (provider vision=true chưa đủ — cùng provider có model chỉ đọc chữ).
      if (needs.vision && (!r.vision || p.capabilities.vision === false)) continue;
      // Khoá cache theo thế hệ cấu hình opaque (TIP-023e §1.2) — xoay khoá cùng độ dài / đổi route params vẫn dựng lại handle;
      // vắng cả hai (test/mock cũ) mới lùi về độ dài key (phương án cũ, kém chặt nhưng không vỡ test hiện có).
      const k = `${p.key}\u0000${r.model}\u0000${purpose}\u0000${p.configRevision ?? ''}\u0000${r.configRevision ?? p.apiKey.length}`;
      let handle = this.built.get(k);
      if (!handle) {
        try {
          handle = this.build(p, r.model, purpose);
        } catch (err) {
          if ((err as { code?: string })?.code === 'RERANK_UNSUPPORTED') continue;
          throw err;
        }
        this.built.set(k, handle);
      }
      // Thế hệ cấu hình đưa ra ngoài cho người gọi ghim không gian embedding (TIP-023e §1.6) — opaque, chỉ ghép khi có ít nhất
      // một nửa (provider hoặc route); vắng cả hai (test/mock cũ) → undefined, người gọi tự quyết không ghim được.
      const configRevision = p.configRevision || r.configRevision ? `${p.configRevision ?? ''}:${r.configRevision ?? ''}` : undefined;
      out.push({ provider: p.key, model: r.model, handle, ...(configRevision ? { configRevision } : {}), ...((r.spaceRevision ?? r.configRevision) ? { routeRevision: (r.spaceRevision ?? r.configRevision)! } : {}) });
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
