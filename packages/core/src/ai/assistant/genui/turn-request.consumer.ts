// Đẩy lượt Trợ lý đã claim sang ROLE=ai (TIP-023c SPEC vận hành): API ghi run `queued` + outbox `assistant.turn_requested` trong cùng
// transaction với claim; consumer `assistant-turn` (ROLE=jobs, queue `events`) đẩy job `assistant-turn` với jobId ổn định theo run →
// relay / consumer chạy lại chỉ còn MỘT job. Worker ROLE=ai chạy lượt (jobs/assistant-turn.processor.ts). Không có runner ở controller.
import { Inject, Optional, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { Queue } from 'bullmq';
import type { Redis } from 'ioredis';
import { eventConsumers, registerEventConsumer, unregisterEventConsumer, type EventConsumer } from '../../../kernel/events/consumer';
import { TURN_REQUESTED } from '../turn.service';

export const ASSISTANT_TURN_QUEUE = 'assistant-turn';
const CONSUMER = 'assistant-turn';

export interface TurnJob {
  ws: string;
  run_id: string;
}

export class TurnQueue {
  private readonly q: Queue<TurnJob>;

  constructor(redis: Redis) {
    this.q = new Queue<TurnJob>(ASSISTANT_TURN_QUEUE, { connection: redis.duplicate() });
  }

  /** Một job mỗi run (jobId = run): đẩy lặp không chạy lại. Lỗi hạ tầng → thử lại; lượt chạy rồi thì runTurn bỏ qua. */
  async push(ws: string, runId: string): Promise<void> {
    await this.q.add('turn', { ws, run_id: runId }, { jobId: `turn-${runId}`, attempts: 3, backoff: { type: 'exponential', delay: 2_000 }, removeOnComplete: 1000, removeOnFail: 1000 });
  }

  onApplicationShutdown(): Promise<void> {
    return this.q.close();
  }
}

export function turnRequestConsumer(queue: Pick<TurnQueue, 'push'>): EventConsumer {
  return {
    name: CONSUMER,
    topics: [TURN_REQUESTED],
    async handle(e) {
      const runId = e.payload.run_id;
      if (typeof runId === 'string') await queue.push(e.workspaceId, runId);
    },
  };
}

/** Đăng ký consumer (một lần mỗi tiến trình — nhiều app Nest trong cùng tiến trình test dùng chung bản đầu). */
export class TurnRequestInstaller implements OnApplicationBootstrap, OnApplicationShutdown {
  private mine: EventConsumer | null = null;

  constructor(@Optional() @Inject(TurnQueue) private readonly queue: TurnQueue | null) {}

  onApplicationBootstrap(): void {
    if (!this.queue || eventConsumers().some((c) => c.name === CONSUMER)) return;
    this.mine = turnRequestConsumer(this.queue);
    registerEventConsumer(this.mine);
  }

  onApplicationShutdown(): void {
    if (this.mine && eventConsumers().includes(this.mine)) unregisterEventConsumer(CONSUMER);
  }
}
