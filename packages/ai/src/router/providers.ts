// Dựng model AI SDK từ cấu hình `llm_provider` (D33): provider gốc qua `@ai-sdk/{anthropic,openai,google,deepseek}`, router
// OpenRouter / 9router / LiteLLM / vLLM… qua `createOpenAICompatible`. Duy nhất file này biết SDK của từng nhà cung cấp.
import { createAnthropic } from '@ai-sdk/anthropic';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createGoogle } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { ModelPurpose } from '../gateway/types';
import { compatibleReranker } from '../rerank/compatible-reranker';
import { RerankUnsupportedError } from '../rerank/types';

export type ProviderKind = 'anthropic' | 'openai' | 'google' | 'deepseek' | 'openai_compatible';

export interface ProviderCapabilities {
  tools?: boolean;
  json_schema?: boolean;
  streaming?: boolean;
  embeddings?: boolean;
  vision?: boolean;
  reasoning?: boolean;
  /** Có reranking model thật (TIP-020e §3.1) — chỉ `openai_compatible` có `POST /rerank` đã kiểm; vắng = không (fail closed). */
  rerank?: boolean;
}

/** Provider đã giải mã key (core đọc `llm_provider` + giải `api_key_enc`). */
export interface ProviderConfig {
  key: string;
  kind: ProviderKind;
  baseUrl?: string | null;
  apiKey: string;
  headers?: Record<string, string> | null;
  capabilities: ProviderCapabilities;
  /** Thế hệ cấu hình opaque (TIP-023e §1.2, `core/ai/router/config-revision.ts`) — đổi khi key/header/URL/capabilities/status đổi,
   *  kể cả xoay khoá cùng độ dài. Vắng (test / mock cũ) → router dùng khoá cache cũ (độ dài key) làm phương án lùi. */
  configRevision?: string;
}

interface Factory {
  languageModel(id: string): unknown;
  embeddingModel?(id: string): unknown;
  rerankingModel?(id: string): unknown;
}

function factoryOf(p: ProviderConfig): Factory {
  const common = { apiKey: p.apiKey, ...(p.headers ? { headers: p.headers } : {}), ...(p.baseUrl ? { baseURL: p.baseUrl } : {}) };
  switch (p.kind) {
    case 'anthropic':
      return createAnthropic(common);
    case 'openai':
      return createOpenAI(common);
    case 'google':
      return createGoogle(common);
    case 'deepseek':
      return createDeepSeek(common);
    case 'openai_compatible':
      if (!p.baseUrl) throw new Error(`provider ${p.key}: openai_compatible cần base_url`);
      // Đã khai `json_schema` → gửi `response_format: json_schema` thật (TIP-021b); thiếu cờ này SDK bỏ schema, model trả tự do.
      return {
        ...createOpenAICompatible({ name: p.key, baseURL: p.baseUrl, apiKey: p.apiKey, ...(p.headers ? { headers: p.headers } : {}), includeUsage: true, supportsStructuredOutputs: p.capabilities.json_schema === true }),
        // SDK openai-compatible không có rerank: chỉ dựng adapter `/rerank` khi provider đã khai khả năng (spike / probe).
        ...(p.capabilities.rerank ? { rerankingModel: (id: string) => compatibleReranker({ provider: p.key, baseUrl: p.baseUrl!, apiKey: p.apiKey, headers: p.headers ?? null }, id) } : {}),
      };
  }
}

/** Model của AI SDK cho một route (chat → LanguageModel, embed → EmbeddingModel, rerank → RerankingModel). Kiểu mờ với bên ngoài gói.
 *  Rerank không bao giờ rơi về LanguageModel: provider thiếu reranking model → RERANK_UNSUPPORTED (router bỏ ứng viên). */
export function buildModel(p: ProviderConfig, model: string, purpose: ModelPurpose): unknown {
  const f = factoryOf(p);
  if (purpose === 'embed') {
    if (!f.embeddingModel) throw new Error(`provider ${p.key} không có embedding`);
    return f.embeddingModel(model);
  }
  if (purpose === 'rerank') {
    if (!f.rerankingModel) throw new RerankUnsupportedError(p.key);
    return f.rerankingModel(model);
  }
  return f.languageModel(model);
}
