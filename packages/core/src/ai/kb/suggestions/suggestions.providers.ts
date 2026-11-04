// Provider hàng chờ học từ hội thoại (TIP-043) — ai.module chỉ trải mảng này (facade), logic nằm trong thư mục suggestions/. Queue
// `kb-suggest` (thiếu Redis → null: không đề xuất, duyệt vẫn chạy) + consumer `kb-suggest` (ROLE=jobs chạy thật).
import type { Provider } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { REDIS } from '../../../kernel/redis';
import { KbSuggestionApproveHandler, KbSuggestionProposeHandler, KbSuggestionRejectHandler } from './suggestion.handlers';
import { KbSuggestInstaller, KbSuggestQueue } from './suggestion.jobs';

export const KB_SUGGESTION_PROVIDERS: Provider[] = [
  KbSuggestionProposeHandler,
  KbSuggestionApproveHandler,
  KbSuggestionRejectHandler,
  { provide: KbSuggestQueue, inject: [{ token: REDIS, optional: true }], useFactory: (r?: Redis) => (r ? new KbSuggestQueue(r) : null) },
  KbSuggestInstaller,
];
