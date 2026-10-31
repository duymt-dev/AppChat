// @appchat/ai — Agent Gateway (Blueprint §5.1): engine, LLM router (D33), model giả cho test / dev. Chỗ duy nhất import `ai` /
// `@ai-sdk/*` (agent-gateway §1). Không import @appchat/core — nhận dependency qua interface (Blueprint §1.1).
export * from './gateway/types';
export { AiSdkEngine, EngineError, LOOP_LIMIT } from './gateway/engine';
export { callKey, resumeMessages, toJson } from './gateway/messages';
export { LlmRouter, isFallbackError, type RouteRow, type RouterConfigSource } from './router/router';
export { buildModel, type ProviderCapabilities, type ProviderConfig, type ProviderKind } from './router/providers';
export { MOCK_MODEL, MOCK_PROVIDER, echoScript, mockLanguageModel, mockModelSource, staticModelSource, type MockScript, type MockTurn } from './testing/mock-model';
