// Tiến trình nền của tác vụ (Blueprint §1.3 queue `ai-task`, ROLE=ai): worker chạy từng lượt (`runTask`) + job lịch `ai-task.sweep`
// mỗi phút (tác vụ tới giờ → đẩy; chỉ mở DB workspace trong tập `ai-task:armed` — không chạm mọi tenant mỗi phút). Consumer sự kiện `ai-tasks` đăng ký ở mọi tiến trình có queue (chỉ ROLE=jobs có worker `events`
// nên chỉ ở đó chạy thật) — `TaskEventsInstaller`.
import { Inject, Optional, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { Queue, Worker } from '../../kernel/jobs/with-job-context';
import type { Redis } from 'ioredis';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import { CLOCK, type Clock } from '../../kernel/clock';
import { eventConsumers, registerEventConsumer, unregisterEventConsumer, type EventConsumer } from '../../kernel/events/consumer';
import type { AppLogger } from '../../kernel/logger/logger';
import { TASK_QUEUE, AI_TASK_QUEUE, TASK_ARMED_KEY, type TaskJob, type TaskQueue } from './task.queue';
import { runTask, type TaskRunDeps } from './task.runner';
import { rebuildArmed, sweepAllTasks, taskEventConsumer, type ArmedSet } from './task-scheduler';

export const TASK_SCHEDULER_QUEUE = 'ai-task-scheduler';
export const TASK_SWEEP_JOB = 'ai-task.sweep';
const SWEEP_MS = 60_000;
/** Đã dựng tập `ai-task:armed` từ DB ít nhất một lần (Redis mới / bị xoá → dựng lại khi worker khởi động). */
const ARMED_BUILT_KEY = 'ai-task:armed:built';

export interface TaskWorkers {
  close(): Promise<void>;
}

export async function startTaskWorkers(redis: Redis, tenants: TenantDbResolver, platform: PlatformDb, queue: TaskQueue, deps: TaskRunDeps, log: AppLogger): Promise<TaskWorkers> {
  const tenant = (ws: string) => tenants.get(TenantContexts.system(ws, 'ai-task'));
  const runs = new Worker<TaskJob>(AI_TASK_QUEUE, async (job) => runTask(deps, await tenant(job.data.ws), job.data.ws, job.data), { connection: redis.duplicate(), concurrency: 4 });
  runs.on('failed', (job, err) => log.warn({ err, task: job?.data.task_id }, 'ai-task lỗi'));
  runs.on('error', (err) => log.warn({ err }, 'ai-task worker error'));
  const armed: ArmedSet = { list: () => redis.smembers(TASK_ARMED_KEY), remove: async (ws) => void (await redis.srem(TASK_ARMED_KEY, ws)) };
  const onError = (ws: string, err: unknown) => log.warn({ err, ws }, 'ai-task sweep lỗi');
  if ((await redis.set(ARMED_BUILT_KEY, '1', 'NX')) === 'OK') await rebuildArmed(platform, tenant, (ws) => queue.arm(ws), onError);
  const sched = new Queue(TASK_SCHEDULER_QUEUE, { connection: redis.duplicate() });
  await sched.upsertJobScheduler(TASK_SWEEP_JOB, { every: SWEEP_MS }, { name: TASK_SWEEP_JOB });
  const sweeper = new Worker(TASK_SCHEDULER_QUEUE, () => sweepAllTasks(platform, tenant, armed, queue, deps.now, onError), { connection: redis.duplicate(), concurrency: 1 });
  sweeper.on('error', (err) => log.warn({ err }, 'ai-task scheduler error'));
  return {
    async close() {
      await runs.close();
      await sweeper.close();
      await sched.close();
    },
  };
}

/** Đăng ký consumer `ai-tasks` (một lần mỗi tiến trình — nhiều app Nest trong cùng tiến trình test dùng chung bản đầu). */
export class TaskEventsInstaller implements OnApplicationBootstrap, OnApplicationShutdown {
  private mine: EventConsumer | null = null;

  constructor(
    @Optional() @Inject(TASK_QUEUE) private readonly queue: TaskQueue | null,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.queue || eventConsumers().some((c) => c.name === 'ai-tasks')) return;
    this.mine = taskEventConsumer(this.queue, () => this.clock.now());
    registerEventConsumer(this.mine);
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.mine && eventConsumers().includes(this.mine)) unregisterEventConsumer('ai-tasks');
    await this.queue?.close();
  }
}
