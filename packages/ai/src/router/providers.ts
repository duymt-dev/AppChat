// Dựng model AI SDK từ cấu hình `llm_provider` (D33): provider gốc qua `@ai-sdk/{anthropic,openai,google,deepseek}`, router
// OpenRouter / 9router / LiteLLM / vLLM… qua `createOpenAICompatible`. Duy nhất file này biết SDK của từng nhà cung cấp.
import { createAnthropic } from '@ai-sdk/anthropic';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createGoogle } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { ModelPurpose } from '../gateway/types';

export type ProviderKind = 'anthropic' | 'openai' | 'google' | 'deepseek' | 'openai_compatible';

export interface ProviderCapabilities {
  tools?: boolean;
  json_schema?: boolean;
  streaming?: boolean;
  embeddings?: boolean;
  vision?: boolean;
  reasoning?: boolean;
}

/** Provider đã giải mã key (core đọc `llm_provider` + giải `api_key_enc`). */
export interface ProviderConfig {
  key: string;
  kind: ProviderKind;
  baseUrl?: string | null;
  apiKey: string;
  headers?: Record<string, string> | null;
  capabilities: ProviderCapabilities;
}

interface Factory {
  languageModel(id: string): unknown;
  embeddingModel?(id: string): unknown;
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
      return createOpenAICompatible({ name: p.key, baseURL: p.baseUrl, apiKey: p.apiKey, ...(p.headers ? { headers: p.headers } : {}), includeUsage: true });
  }
}

/** Model của AI SDK cho một route (chat → LanguageModel, embed → EmbeddingModel). Kiểu mờ với bên ngoài gói. */
export function buildModel(p: ProviderConfig, model: string, purpose: ModelPurpose): unknown {
  const f = factoryOf(p);
  if (purpose === 'embed') {
    if (!f.embeddingModel) throw new Error(`provider ${p.key} không có embedding`);
    return f.embeddingModel(model);
  }
  return f.languageModel(model);
}
