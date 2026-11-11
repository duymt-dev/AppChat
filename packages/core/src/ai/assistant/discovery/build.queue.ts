// Đẩy `assistant.discovery_requested` sang ROLE=ai (TIP-023e §1.4, mirror turn-request.consumer.ts): API/handler ghi outbox trong
// transaction đã xác nhận → consumer (ROLE=jobs, queue `events`) đẩy job `discovery-build` với jobId = generation_id → relay / consumer
// chạy lại chỉ còn MỘT job cho một lần dựng. Worker ROLE=ai chạy build thật (build.processor.ts). Không có runner ở action handler.
import { Inject, Optional, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { Queue } from '../../../kernel/jobs/with-job-context';
import type { Redis } from 'ioredis';
import { eventConsumers, registerEventConsumer, unregisterEventConsumer, type EventConsumer } from '../../../kernel/events/consumer';

export const DISCOVERY_BUILD_QUEUE = 'discovery-build';
const CONSUMER = 'discovery-build';
const TOPIC = 'assistant.discovery_requested';

export interface DiscoveryBuildJob {
  ws: string;
  generation_id: string;
}

export class DiscoveryBuildQueue {
  private readonly q: Queue<DiscoveryBuildJob>;

  constructor(redis: Redis) {
    this.q = new Queue<DiscoveryBuildJob>(DISCOVERY_BUILD_QUEUE, { connection: redis.duplicate() });
  }

  /** Một job mỗi generation (jobId = generation_id): đẩy lặp (relay chạy lại) không xếp hàng hai lần. */
  async push(ws: string, generationId: string): Promise<void> {
    await this.q.add('build', { ws, generation_id: generationId }, { jobId: `discovery-${generationId}`, attempts: 3, backoff: { type: 'exponential', delay: 5_000 }, removeOnComplete: 1000, removeOnFail: 1000 });
  }

  onApplicationShutdown(): Promise<void> {
    return this.q.close();
  }
}

export function discoveryBuildConsumer(queue: Pick<DiscoveryBuildQueue, 'push'>): EventConsumer {
  return {
    name: CONSUMER,
    topics: [TOPIC],
    async handle(e) {
      const id = e.payload.generation_id;
      if (typeof id === 'string' && id) await queue.push(e.workspaceId, id);
    },
  };
}

/** Đăng ký consumer một lần mỗi tiến trình (nhiều app Nest trong cùng tiến trình test dùng chung bản đầu). */
export class DiscoveryBuildInstaller implements OnApplicationBootstrap, OnApplicationShutdown {
  private mine: EventConsumer | null = null;

  constructor(@Optional() @Inject(DiscoveryBuildQueue) private readonly queue: DiscoveryBuildQueue | null) {}

  onApplicationBootstrap(): void {
    if (!this.queue || eventConsumers().some((c) => c.name === CONSUMER)) return;
    this.mine = discoveryBuildConsumer(this.queue);
    registerEventConsumer(this.mine);
  }

  onApplicationShutdown(): void {
    if (this.mine && eventConsumers().includes(this.mine)) unregisterEventConsumer(CONSUMER);
  }
}
