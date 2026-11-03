// @appchat/ai — Agent Gateway (Blueprint §5.1): engine, LLM router (D33), model giả cho test / dev. Chỗ duy nhất import `ai` /
// `@ai-sdk/*` (agent-gateway §1). Không import @appchat/core — nhận dependency qua interface (Blueprint §1.1).
export * from './gateway/types';
export { AiSdkEngine, EngineError, LOOP_LIMIT } from './gateway/engine';
export { callKey, resumeMessages, toJson } from './gateway/messages';
export { LlmRouter, isFallbackError, type RouteRow, type RouterConfigSource } from './router/router';
export { buildModel, type ProviderCapabilities, type ProviderConfig, type ProviderKind } from './router/providers';
export { MOCK_MODEL, MOCK_PROVIDER, echoScript, mockLanguageModel, mockModelSource, staticModelSource, type MockCtx, type MockScript, type MockTurn } from './testing/mock-model';
export { AiSdkEmbedder, EMBED_DIM, type EmbedResult, type Embedder } from './embed/embedder';
export { CHUNK_MAX_TOKENS, CHUNK_MIN_TOKENS, chunkDocument, hasPrice, tokensOf, type Chunk, type ChunkMeta, type DocBlock } from './kb/chunker';
export { RRF_K, rrf } from './kb/rrf';
export { MOCK_EMBED_MODEL, mockEmbedSource, mockEmbeddingModel, mockVector } from './testing/mock-embed';
export { PROMPTS, prompt, type PromptDoc, type PromptLocale } from './prompts';
export { PiiMasker, unmaskPii, type PiiMap } from './reply/pii';
export { PLAIN_CONFIDENCE, agentReplySchema, parseAgentReply, type AgentReply } from './reply/output';
export { decideHandoff, type HandoffInput, type HandoffReason } from './reply/handoff';
export { TreeSkeletonStream, skeletonOf, type SkeletonNode, type UiSkeleton } from './genui/structured-stream';
