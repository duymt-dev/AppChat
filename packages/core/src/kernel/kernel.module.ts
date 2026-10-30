// Kernel dùng chung api + worker. TIP-001: Clock + logger; TIP-002: PlatformDb + TenantDbResolver; TIP-003: Redis + Action kernel.
// Mỗi phần chỉ bật khi env có cấu hình (process không cần DB / Redis — vd. test health — vẫn boot được).
import { Global, Module, type DynamicModule, type Provider } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { z } from 'zod';
import { CLOCK, SystemClock } from './clock';
import { createLogger } from './logger/logger';
import { REDIS, createRedis } from './redis';
import { ActionsModule } from './actions/actions.module';
import { DB_ENV, PLATFORM_DB, TENANT_RESOLVER, WORKSPACE_REGISTRY, dbProviders, readDbEnv } from './tenant/tenant.providers';

export const LOGGER = Symbol('LOGGER');
/** Bản env thô mà forRoot nhận — domain tự parse phần của mình (vd. identity.env.ts), test truyền env riêng. */
export const ENV_SOURCE = Symbol('ENV_SOURCE');

const base: Provider[] = [
  { provide: CLOCK, useClass: SystemClock },
  { provide: LOGGER, useFactory: () => createLogger({ level: process.env.LOG_LEVEL ?? 'info' }) },
];

const kernelEnv = z.object({
  REDIS_URL: z.string().regex(/^rediss?:\/\//).optional(),
  /** Khoá chủ 32 byte (base64 / hex) — HMAC confirm_token; TIP sau dùng cho AES-256-GCM (ops §2.2). */
  APP_ENC_KEY: z.string().min(32).optional(),
});

class RedisCloser {
  constructor(private readonly r: Redis) {}
  async onApplicationShutdown(): Promise<void> {
    await this.r.quit().catch(() => undefined);
  }
}

@Global()
@Module({ providers: base, exports: [CLOCK, LOGGER] })
export class KernelModule {
  /** Kernel + DB + Redis + Action kernel tuỳ env (api / worker thật); thiếu env thì như KernelModule. */
  static forRoot(source: Record<string, string | undefined> = process.env): DynamicModule {
    const db = readDbEnv(source);
    const k = kernelEnv.parse(source);
    const providers: Provider[] = [{ provide: ENV_SOURCE, useValue: source }];
    const exports: (string | symbol)[] = [ENV_SOURCE];
    const imports: DynamicModule[] = [];
    if (db) {
      providers.push(...dbProviders(db));
      exports.push(DB_ENV, PLATFORM_DB, TENANT_RESOLVER, WORKSPACE_REGISTRY);
    }
    if (k.REDIS_URL) {
      providers.push(
        { provide: REDIS, useFactory: () => createRedis(k.REDIS_URL!) },
        { provide: 'REDIS_CLOSER', inject: [REDIS], useFactory: (r: Redis) => new RedisCloser(r) },
      );
      exports.push(REDIS);
    }
    if (db && k.REDIS_URL) {
      if (!k.APP_ENC_KEY) throw new Error('Biến môi trường không hợp lệ: APP_ENC_KEY');
      imports.push(ActionsModule.forRoot({ confirmSecret: k.APP_ENC_KEY }));
    }
    return { module: KernelModule, global: true, imports, providers, exports: [...exports, ...imports] };
  }
}
