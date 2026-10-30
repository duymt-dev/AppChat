// Kernel dùng chung api + worker. TIP-001: Clock + logger; TIP-002: PlatformDb + TenantDbResolver (khi có env DB);
// TIP-003 thêm ActionExecutor, EventBus… vào đây.
import { Global, Module, type DynamicModule, type Provider } from '@nestjs/common';
import { CLOCK, SystemClock } from './clock';
import { createLogger } from './logger/logger';
import { DB_ENV, PLATFORM_DB, TENANT_RESOLVER, WORKSPACE_REGISTRY, dbProviders, readDbEnv } from './tenant/tenant.providers';

export const LOGGER = Symbol('LOGGER');

const base: Provider[] = [
  { provide: CLOCK, useClass: SystemClock },
  { provide: LOGGER, useFactory: () => createLogger({ level: process.env.LOG_LEVEL ?? 'info' }) },
];

@Global()
@Module({ providers: base, exports: [CLOCK, LOGGER] })
export class KernelModule {
  /** Kernel + DB nếu env có cấu hình DB (api / worker thật); không có thì như KernelModule. */
  static forRoot(source: Record<string, string | undefined> = process.env): DynamicModule {
    const env = readDbEnv(source);
    if (!env) return { module: KernelModule, global: true };
    return {
      module: KernelModule,
      global: true,
      providers: dbProviders(env),
      exports: [DB_ENV, PLATFORM_DB, TENANT_RESOLVER, WORKSPACE_REGISTRY],
    };
  }
}
