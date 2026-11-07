// TIP-002: KernelModule.forRoot — không có env DB thì không đăng ký provider DB; có env thì cấp PlatformDb + TenantDbResolver.
import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { TenantDbResolver } from '@appchat/db';
import { KernelModule, PLATFORM_DB, TENANT_RESOLVER, WORKSPACE_REGISTRY, readDbEnv } from '../src/kernel';

const URLS = {
  PLATFORM_DATABASE_URL: 'postgresql://app:pw@localhost:5432/appchat_platform',
  TENANT_DATABASE_URL: 'postgresql://tenant:pw@localhost:5432/postgres',
};

describe('KernelModule.forRoot', () => {
  it('không env DB → không có provider DB', async () => {
    const mod = await Test.createTestingModule({ imports: [KernelModule.forRoot({})] }).compile();
    expect(() => mod.get(TENANT_RESOLVER)).toThrow();
    await mod.close();
  });

  it('có env DB → PlatformDb + TenantDbResolver + WorkspaceRegistry; đóng sạch khi shutdown', async () => {
    const mod = await Test.createTestingModule({ imports: [KernelModule.forRoot(URLS)] }).compile();
    expect(mod.get(TENANT_RESOLVER)).toBeInstanceOf(TenantDbResolver);
    expect(mod.get(PLATFORM_DB)).toHaveProperty('$disconnect');
    expect(mod.get(WORKSPACE_REGISTRY)).toHaveProperty('find');
    await mod.close();
  });

  it('readDbEnv: URL sai → lỗi; thiếu cả 2 → null; mặc định pool / cache', () => {
    expect(readDbEnv({})).toBeNull();
    expect(() => readDbEnv({ ...URLS, TENANT_DATABASE_URL: 'mysql://x' })).toThrow();
    expect(readDbEnv(URLS)).toMatchObject({ TENANT_POOL_MAX: 3, TENANT_CLIENT_CACHE: 100, TENANT_CLIENT_IDLE_MS: 600_000 });
  });
});
