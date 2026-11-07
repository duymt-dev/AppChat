// Queue `kb-suggest` (TIP-043): jobId `kbsug-<hội thoại>-<mốc>` — đẩy lặp (event lặp / relay chạy lại) chỉ còn một job; thử lại 3 lần.
import { Queue } from '../../../kernel/jobs/with-job-context';
import type { Redis } from 'ioredis';

export const KB_SUGGEST_QUEUE = 'kb-suggest';
export interface KbSuggestJob {
  ws: string;
  conversation_id: string;
  cutoff: string;
}

export class KbSuggestQueue {
  private readonly q: Queue<KbSuggestJob>;

  constructor(redis: Redis) {
    this.q = new Queue<KbSuggestJob>(KB_SUGGEST_QUEUE, { connection: redis.duplicate() });
  }

  async push(ws: string, conversationId: string, cutoff: string): Promise<void> {
    await this.q.add('suggest', { ws, conversation_id: conversationId, cutoff }, { jobId: `kbsug-${conversationId}-${cutoff}`, attempts: 3, backoff: { type: 'exponential', delay: 10_000 }, removeOnComplete: 1000, removeOnFail: 1000 });
  }

  onApplicationShutdown(): Promise<void> {
    return this.q.close();
  }
}
