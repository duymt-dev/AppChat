// Đánh thức xử lý tệp (TIP-023f §1.5, §5.1): `assistant.input_prepare_requested` (outbox, ROLE=jobs) → queue `assistant-input` với
// jobId = artifact:revision (relay chạy lại không nhân đôi). Workspace được đánh dấu vào tập ARMED để job quét định kỳ (installer.ts)
// khôi phục việc mất. Hàng đợi chỉ là đánh thức — hàng artifact mới là nguồn sự thật.
import { Inject, Optional, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { Queue } from '../../../kernel/jobs/with-job-context';
import { eventConsumers, registerEventConsumer, unregisterEventConsumer, type EventConsumer } from '../../../kernel/events/consumer';

export const INPUT_QUEUE = 'assistant-input';
export const INPUT_ARMED_KEY = 'assistant-input:armed';
const CONSUMER = 'assistant-input';

export interface InputJob {
  ws: string;
  artifact_id?: string;
}

export class AssistantInputQueue {
  private readonly q: Queue<InputJob>;

  constructor(private readonly redis: Redis) {
    this.q = new Queue<InputJob>(INPUT_QUEUE, { connection: redis.duplicate() });
  }

  async push(ws: string, artifactId: string, revision: number): Promise<void> {
    await this.redis.sadd(INPUT_ARMED_KEY, ws);
    await this.q.add('prepare', { ws, artifact_id: artifactId }, { jobId: `input-${artifactId}-${revision}`, attempts: 3, backoff: { type: 'exponential', delay: 3_000 }, removeOnComplete: 1000, removeOnFail: 1000 });
  }

  onApplicationShutdown(): Promise<void> {
    return this.q.close();
  }
}

export function inputConsumer(queue: Pick<AssistantInputQueue, 'push'>): EventConsumer {
  return {
    name: CONSUMER,
    topics: ['assistant.input_prepare_requested'],
    async handle(e) {
      const id = e.payload.artifact_id;
      if (typeof id === 'string' && id) await queue.push(e.workspaceId, id, Number(e.payload.revision ?? 1));
    },
  };
}

export class AssistantInputConsumerInstaller implements OnApplicationBootstrap, OnApplicationShutdown {
  private mine: EventConsumer | null = null;

  constructor(@Optional() @Inject(AssistantInputQueue) private readonly queue: AssistantInputQueue | null) {}

  onApplicationBootstrap(): void {
    if (!this.queue || eventConsumers().some((c) => c.name === CONSUMER)) return;
    this.mine = inputConsumer(this.queue);
    registerEventConsumer(this.mine);
  }

  onApplicationShutdown(): void {
    if (this.mine && eventConsumers().includes(this.mine)) unregisterEventConsumer(CONSUMER);
  }
}
