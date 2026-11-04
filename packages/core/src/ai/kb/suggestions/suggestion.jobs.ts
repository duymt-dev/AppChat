// Tiến trình nền hàng chờ học từ hội thoại (TIP-043): queue `kb-suggest` — jobId `kbsug-<hội thoại>-<mốc>` (đẩy lặp → một job), thử lại 3
// lần; worker ROLE=ai chạy `proposeFromConversation` (model ngoài transaction). Consumer `kb-suggest` của queue `events` đăng ký ở mọi tiến
// trình có queue (chỉ ROLE=jobs có worker `events` nên chỉ ở đó chạy thật) — `KbSuggestInstaller`. Không quét toàn DB theo lịch.
import { Inject, Optional, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { Worker } from '../../../kernel/jobs/with-job-context';
import type { Redis } from 'ioredis';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import { eventConsumers, registerEventConsumer, unregisterEventConsumer, type EventConsumer } from '../../../kernel/events/consumer';
import type { AppLogger } from '../../../kernel/logger/logger';
import { KbIngestQueue } from '../kb.queue';
import { KB_SUGGEST_CONSUMER, kbSuggestConsumer } from './suggestion.consumer';
import { proposeFromConversation, type ProposeDeps } from './suggestion.service';
import { KB_SUGGEST_QUEUE, KbSuggestQueue, type KbSuggestJob } from './suggestion.queue';

export { KB_SUGGEST_QUEUE, KbSuggestQueue, type KbSuggestJob };

export function startKbSuggestWorker(redis: Redis, tenants: TenantDbResolver, deps: ProposeDeps, log: AppLogger): Worker<KbSuggestJob> {
  const w = new Worker<KbSuggestJob>(
    KB_SUGGEST_QUEUE,
    async (job) => {
      const { ws, conversation_id, cutoff } = job.data;
      const r = await proposeFromConversation(deps, await tenants.get(TenantContexts.system(ws, 'kb-suggest')), ws, conversation_id, cutoff);
      if (r.status === 'failed') log.warn({ ws, conversation: conversation_id, reason: r.reason, run: r.run_id }, 'kb-suggest không đề xuất được');
      return r;
    },
    { connection: redis.duplicate(), concurrency: 2 },
  );
  w.on('error', (err) => log.warn({ err }, 'kb-suggest worker error'));
  return w;
}

/** Đăng ký consumer `kb-suggest` (một lần mỗi tiến trình — nhiều app Nest trong cùng tiến trình test dùng chung bản đầu). */
export class KbSuggestInstaller implements OnApplicationBootstrap, OnApplicationShutdown {
  private mine: EventConsumer | null = null;

  constructor(
    @Optional() @Inject(KbSuggestQueue) private readonly queue: KbSuggestQueue | null,
    @Optional() @Inject(KbIngestQueue) private readonly ingest: KbIngestQueue | null,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.queue || eventConsumers().some((c) => c.name === KB_SUGGEST_CONSUMER)) return;
    this.mine = kbSuggestConsumer(this.queue, this.ingest);
    registerEventConsumer(this.mine);
  }

  onApplicationShutdown(): void {
    if (this.mine && eventConsumers().includes(this.mine)) unregisterEventConsumer(KB_SUGGEST_CONSUMER);
  }
}
