// Domain `authz` — role, team, permission catalog, AuthzContext (cache Redis), scopeFilter (TIP-005, D27, D32).
// Seed vai trò hệ thống đăng ký vào registry seed của kernel khi nạp file `seed.ts` (chạy trong tenant.provision).
import { Module } from '@nestjs/common';
import type { Redis } from 'ioredis';
import type { PlatformDb, TenantDbResolver } from '@appchat/db';
import { REDIS } from '../kernel/redis';
import { PLATFORM_DB, TENANT_RESOLVER } from '../kernel/tenant/tenant.providers';
import './seed';
import { AuthzResolver } from './services/authz-resolver';
import { RolesService } from './services/roles.service';

const opt = (token: symbol) => ({ token, optional: true });

@Module({
  providers: [
    {
      provide: AuthzResolver,
      inject: [opt(PLATFORM_DB), opt(TENANT_RESOLVER), opt(REDIS)],
      useFactory: (p?: PlatformDb, t?: TenantDbResolver, r?: Redis) => (p && t ? new AuthzResolver(p, t, r ?? null) : null),
    },
    {
      provide: RolesService,
      inject: [opt(PLATFORM_DB), opt(TENANT_RESOLVER)],
      useFactory: (p?: PlatformDb, t?: TenantDbResolver) => (p && t ? new RolesService(p, t) : null),
    },
  ],
  exports: [AuthzResolver, RolesService],
})
export class AuthzModule {}
