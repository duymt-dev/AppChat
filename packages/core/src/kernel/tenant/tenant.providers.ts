// Provider DB của kernel (TIP-002): PlatformDb + TenantDbResolver từ env. Registry workspace = port (DC-008):
// TIP-004: PrismaWorkspaceRegistry đọc bảng `workspace` của DB nền tảng; test thay bằng MemoryWorkspaceRegistry qua override token.
import type { FactoryProvider, OnApplicationShutdown, Provider } from '@nestjs/common';
import {
  PrismaWorkspaceRegistry,
  TenantDbResolver,
  createPlatformDb,
  dbEnv,
  type DbEnv,
  type PlatformDb,
  type WorkspaceRegistry,
} from '@appchat/db';

export const DB_ENV = Symbol('DB_ENV');
export const PLATFORM_DB = Symbol('PLATFORM_DB');
export const TENANT_RESOLVER = Symbol('TENANT_RESOLVER');
export const WORKSPACE_REGISTRY = Symbol('WORKSPACE_REGISTRY');

/** Biến DB có đủ không — thiếu thì kernel không đăng ký provider DB (process không cần DB, vd. test health). */
export function readDbEnv(source: Record<string, string | undefined> = process.env): DbEnv | null {
  if (!source.PLATFORM_DATABASE_URL && !source.TENANT_DATABASE_URL) return null;
  return dbEnv.parse(source);
}

class Closer implements OnApplicationShutdown {
  constructor(
    private readonly platform: PlatformDb,
    private readonly resolver: TenantDbResolver,
  ) {}
  async onApplicationShutdown(): Promise<void> {
    await Promise.all([this.platform.$disconnect(), this.resolver.close()]);
  }
}

export function dbProviders(env: DbEnv): Provider[] {
  const platform: FactoryProvider = { provide: PLATFORM_DB, useFactory: () => createPlatformDb(env.PLATFORM_DATABASE_URL, env.PLATFORM_POOL_MAX) };
  const resolver: FactoryProvider = {
    provide: TENANT_RESOLVER,
    inject: [WORKSPACE_REGISTRY],
    useFactory: (registry: WorkspaceRegistry) => {
      const r = new TenantDbResolver({
        registry,
        baseUrl: env.TENANT_DATABASE_URL,
        poolMax: env.TENANT_POOL_MAX,
        cacheSize: env.TENANT_CLIENT_CACHE,
        idleMs: env.TENANT_CLIENT_IDLE_MS,
      });
      r.startSweeper();
      return r;
    },
  };
  return [
    { provide: DB_ENV, useValue: env },
    { provide: WORKSPACE_REGISTRY, inject: [PLATFORM_DB], useFactory: (p: PlatformDb) => new PrismaWorkspaceRegistry(p) },
    platform,
    resolver,
    { provide: 'DB_CLOSER', inject: [PLATFORM_DB, TENANT_RESOLVER], useFactory: (p: PlatformDb, t: TenantDbResolver) => new Closer(p, t) },
  ];
}
