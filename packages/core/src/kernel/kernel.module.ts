// Kernel dùng chung api + worker. TIP-001: Clock + logger; TIP-002: PlatformDb + TenantDbResolver; TIP-003: Redis + Action kernel.
// Mỗi phần chỉ bật khi env có cấu hình (process không cần DB / Redis — vd. test health — vẫn boot được).
import { Global, Module, type DynamicModule, type Provider } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { z } from 'zod';
import { CLOCK, SystemClock, type Clock } from './clock';
import { ENC_KEY, parseEncKey } from './crypto';
import { FilesService } from './files/files.service';
import { LocalStorage, STORAGE, defaultFilesDir, type Storage } from './files/storage';
import { createLogger } from './logger/logger';
import { REDIS, createRedis } from './redis';
import { ActionsModule } from './actions/actions.module';
import { GenUiIntents } from './actions/genui-intent';
import { SecretVault } from './actions/secret-vault';
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
  /** Khoá chủ 32 byte (base64 / hex) — HMAC confirm_token + AES-256-GCM bí mật của DN (ops §2.2, crypto.ts). */
  APP_ENC_KEY: z.string().min(32).optional(),
  /** Thư mục Storage `local` (Blueprint §11): dev `./.data/files`, prod `/srv/appchat/files`. */
  FILES_DIR: z.string().min(1).optional(),
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
    const exports: (string | symbol | typeof FilesService | typeof GenUiIntents | typeof SecretVault)[] = [ENV_SOURCE];
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
    if (k.APP_ENC_KEY) {
      // Khoá AES-256-GCM cho bí mật của DN (ops §2.2, TIP-012) — sai định dạng thì dừng boot.
      providers.push({ provide: ENC_KEY, useValue: parseEncKey(k.APP_ENC_KEY) });
      exports.push(ENC_KEY);
    }
    if (db) {
      // Tệp tải lên (TIP-020): Storage local + FilesService (bảng `file` của DB tenant).
      providers.push(
        { provide: STORAGE, useFactory: () => new LocalStorage(k.FILES_DIR ?? defaultFilesDir()) },
        { provide: FilesService, inject: [STORAGE, CLOCK], useFactory: (st: Storage, c: Clock) => new FilesService(st, () => c.now()) },
      );
      exports.push(STORAGE, FilesService);
    }
    if (db && k.REDIS_URL) {
      if (!k.APP_ENC_KEY) throw new Error('Biến môi trường không hợp lệ: APP_ENC_KEY');
      imports.push(ActionsModule.forRoot({ confirmSecret: k.APP_ENC_KEY }));
      // GenUI (TIP-023c): intent ký cho node action của cây Trợ lý + vault bí mật ngắn hạn giữa preview và confirm.
      const secret = k.APP_ENC_KEY;
      providers.push(
        { provide: GenUiIntents, inject: [REDIS], useFactory: (r: Redis) => new GenUiIntents(r, `genui:${secret}`) },
        { provide: SecretVault, inject: [REDIS, ENC_KEY], useFactory: (r: Redis, key: Buffer) => new SecretVault(r, key) },
      );
      exports.push(GenUiIntents, SecretVault);
    }
    return { module: KernelModule, global: true, imports, providers, exports: [...exports, ...imports] };
  }
}
