// Worker ROLE=jobs thật cho integration TIP-006+: kernel + outbox relay + queue `events` + domain notify (consumer notify /
// realtime, queue notify-mail) + billing (trial, scheduler hết hạn trial). Đồng hồ / emitter thay được để kiểm toast (giờ không làm phiền) và gói realtime.
import 'reflect-metadata';
import { Test, type TestingModule } from '@nestjs/testing';
import IORedis from 'ioredis';
import { TenantContexts, TenantDbResolver, PrismaWorkspaceRegistry, type PlatformDb } from '@appchat/db';
import {
  CLOCK,
  KernelModule,
  LOGGER,
  MAIL_PROVIDER,
  NotifyJobsModule,
  BillingJobsModule,
  OutboxJobsModule,
  REALTIME_EMITTER,
  createLogger,
  markDirty,
  writeOutbox,
  type Clock,
  type RealtimeEmitter,
} from '@appchat/core';
import type { MemoryMailProvider } from '@appchat/integrations';
import { env } from './setup';

export interface WorkerHarness {
  app: TestingModule;
  mail: MemoryMailProvider;
  /** Ghi event vào outbox của workspace (như handler) + đánh dấu bẩn → relay → queue `events` → consumer. */
  emit(ws: string, topic: string, payload: Record<string, unknown>): Promise<void>;
  close(): Promise<void>;
}

export async function startWorker(platform: PlatformDb, opts: { clock?: Clock; emitter?: RealtimeEmitter } = {}): Promise<WorkerHarness> {
  let b = Test.createTestingModule({ imports: [KernelModule.forRoot({ ...env, LOG_LEVEL: 'silent' }), OutboxJobsModule, NotifyJobsModule, BillingJobsModule] })
    .overrideProvider(LOGGER)
    .useValue(createLogger({ level: 'silent' }));
  if (opts.clock) b = b.overrideProvider(CLOCK).useValue(opts.clock);
  if (opts.emitter) b = b.overrideProvider(REALTIME_EMITTER).useValue(opts.emitter);
  const app = await b.compile();
  await app.init();
  const redis = new IORedis(env.REDIS_URL!);
  const resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(platform), baseUrl: env.TENANT_DATABASE_URL! });
  return {
    app,
    mail: app.get<MemoryMailProvider>(MAIL_PROVIDER, { strict: false }),
    async emit(ws, topic, payload) {
      const db = await resolver.get(TenantContexts.system(ws, 'test-emit'));
      // Theo đồng hồ của worker: relay chỉ lấy event có available_at ≤ now (đồng hồ test cố định).
      await db.$transaction((tx) => writeOutbox(tx, ws, [{ topic, payload }], opts.clock?.now() ?? new Date()));
      await markDirty(redis, ws);
    },
    async close() {
      await app.close();
      await resolver.close();
      await redis.quit();
    },
  };
}

export const until = async (fn: () => Promise<boolean> | boolean, ms = 20_000): Promise<boolean> => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await fn()) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
};
