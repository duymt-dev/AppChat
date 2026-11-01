// Queue `agent-reply` (worker ROLE=ai — Blueprint §1.3, §5.3 bước 1): tin khách vào → job trễ 3 giây, dedup theo hội thoại; tin mới
// trong lúc chờ thay job cũ và đếm lại 3 giây (gom tin liên tiếp); job đang chạy thì giữ một job chờ sau nó (không chạy song song
// trên cùng hội thoại). Người đẩy: worker `channel-inbound` sau commit tin (pipeline quyết có kích hay không).
import { Queue } from 'bullmq';
import type { Redis } from 'ioredis';

export const AGENT_REPLY_QUEUE = 'agent-reply';
export const REPLY_DEBOUNCE_MS = 3_000;

export interface ReplyJob {
  ws: string;
  conversation_id: string;
  /** Tin khách mới nhất lúc đẩy — worker bỏ qua nếu đã có lượt agent sau tin này. */
  message_id: string;
}

export class AgentReplyQueue {
  private readonly q: Queue<ReplyJob>;

  constructor(redis: Redis, private readonly debounceMs = REPLY_DEBOUNCE_MS) {
    this.q = new Queue<ReplyJob>(AGENT_REPLY_QUEUE, { connection: redis.duplicate() });
  }

  async push(job: ReplyJob): Promise<void> {
    await this.q.add('reply', job, {
      delay: this.debounceMs,
      deduplication: { id: `agent-reply:${job.conversation_id}`, ttl: this.debounceMs, extend: true, replace: true },
      attempts: 2,
      backoff: { type: 'fixed', delay: 5_000 },
      removeOnComplete: 1000,
      removeOnFail: 1000,
    });
  }

  /** Test: số job đang chờ / trễ. */
  waiting(): Promise<number> {
    return this.q.getJobCountByTypes('delayed', 'waiting', 'prioritized');
  }

  onApplicationShutdown(): Promise<void> {
    return this.q.close();
  }
}
