// Facade đăng ký tái tạo chỉ mục + rerank kho tri thức (TIP-020e) — AiModule import danh sách này (không phình ai.module.ts). Queue cần
// Redis (thiếu → null, action vẫn ghi generation; quét khôi phục đẩy job khi có Redis). Reranker: route `rerank` của router (mock → không
// có reranker — RRF).
import type { Provider } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { AiSdkReranker, LlmRouter, type Reranker } from '@appchat/ai';
import { REDIS } from '../../../kernel/redis';
import { AI_ENV, type AiEnv } from '../../ai.env';
import { ProviderStore } from '../../router/provider.store';
import { KbReindexCancelHandler, KbReindexHandler } from './kb-reindex.handler';
import { KbReindexQueue } from './reindex.queue';

export const KB_RERANKER = Symbol('KB_RERANKER');

export const KB_REINDEX_PROVIDERS: Provider[] = [
  { provide: KbReindexQueue, inject: [{ token: REDIS, optional: true }], useFactory: (r?: Redis) => (r ? new KbReindexQueue(r) : null) },
  {
    provide: KB_RERANKER,
    inject: [AI_ENV, ProviderStore],
    useFactory: (env: AiEnv, store: ProviderStore | null): Reranker | null => (env.AI_ENGINE === 'mock' || !store ? null : new AiSdkReranker(new LlmRouter(store))),
  },
  KbReindexHandler,
  KbReindexCancelHandler,
];

export const KB_REINDEX_EXPORTS = [KbReindexQueue, KB_RERANKER] as const;
