// @appchat/ai — Agent Gateway (Blueprint §5.1): engine, LLM router (D33), model giả cho test / dev. Chỗ duy nhất import `ai` /
// `@ai-sdk/*` (agent-gateway §1). Không import @appchat/core — nhận dependency qua interface (Blueprint §1.1).
export * from './gateway/types';
export { AiSdkEngine, EngineError, LOOP_LIMIT } from './gateway/engine';
export { classifyAttemptError } from './gateway/attempts';
export { StructuredError, assertStructuredRequest, parseStructured, schemaError } from './gateway/structured';
export { OUTPUT_TOKENS_DEFAULT, OUTPUT_TOKENS_MAX, REQUEST_MAX_BYTES, outputTokens, requestBytes } from './gateway/limits';
export { callKey, resumeMessages, toJson } from './gateway/messages';
export { SUPERSEDED, checkpointBatch, resumeFromCheckpoint, type PlanCheckpoint } from './gateway/plan-checkpoint';
export { hydrateMessages, inputRefsOf, isInputRef, stripMedia, type HydratedPart, type InputRefPart, type InputResolver } from './gateway/input-parts';
export { LlmRouter, isFallbackError, type RouteRow, type RouterConfigSource } from './router/router';
export { buildModel, type ProviderCapabilities, type ProviderConfig, type ProviderKind } from './router/providers';
export { mergeCapabilities, probeError, probeProvider, type ProbeCapability, type ProbeCheck, type ProbeError, type ProbeRequest } from './router/probe';
export { MOCK_MODEL, MOCK_PROVIDER, echoScript, mockLanguageModel, mockModelSource, staticModelSource, type MockCtx, type MockScript, type MockTurn } from './testing/mock-model';
export { AiSdkEmbedder, EMBED_DIM, type EmbedResult, type Embedder } from './embed/embedder';
export type { EmbedAttempt, EmbedHooks } from './embed/attempts';
export { CHUNK_MAX_TOKENS, CHUNK_MIN_TOKENS, chunkDocument, hasPrice, tokensOf, type Chunk, type ChunkMeta, type DocBlock } from './kb/chunker';
export { RRF_K, rrf } from './kb/rrf';
export { KB_LABELS, nameVariants, redactForKnowledge, sensitiveLeft, type KbLabelLocale, type KnowledgeContext } from './kb/suggestion-redaction';
export { MOCK_EMBED_MODEL, mockEmbedSource, mockEmbeddingModel, mockVector } from './testing/mock-embed';
export { PROMPTS, prompt, type PromptDoc, type PromptLocale } from './prompts';
export { PiiMasker, unmaskPii, type PiiMap } from './reply/pii';
export { MAX_ANSWER_CITATIONS, PLAIN_CONFIDENCE, agentReplySchema, answerCitationSchema, parseAgentReply, type AgentReply, type AnswerCitation } from './reply/output';
export { decideHandoff, type HandoffInput, type HandoffReason } from './reply/handoff';
export { TreeSkeletonStream, skeletonOf, type SkeletonNode, type UiSkeleton } from './genui/structured-stream';
