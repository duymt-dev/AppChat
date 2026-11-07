// Nest wiring của Action kernel (TIP-003). Handler là provider bình thường trong module domain (có @ActionHandler);
// lúc boot DiscoveryService quét mọi provider → ActionHandlerRegistry.load (thiếu / trùng / id lạ → boot fail).
import { Global, Inject, Module, type DynamicModule, type OnModuleInit } from '@nestjs/common';
import { DiscoveryModule, DiscoveryService } from '@nestjs/core';
import { registry } from '@appchat/actions';
import type { PlatformDb, TenantDbResolver } from '@appchat/db';
import { CLOCK, type Clock } from '../clock';
import { REDIS, type KeyValueStore } from '../redis';
import { PLATFORM_DB, TENANT_RESOLVER } from '../tenant/tenant.providers';
import { AUTHORIZER, type Authorizer } from './action-context';
import { ConfirmTokens } from './confirm-token';
import { ContextAuthorizer } from './authorizer';
import { ActionExecutor } from './executor';
import { instrumentExecutor } from '../metrics/collectors';
import { actionIdOf } from './handler';
import { ActionHandlerRegistry } from './handler-registry';
import { UndoService } from './undo.service';
import { ENC_KEY } from '../crypto';
import { PlatformOperations } from '../consistency/platform-operation';

export const CONFIRM_SECRET = Symbol('CONFIRM_SECRET');

class HandlerDiscovery implements OnModuleInit {
  constructor(
    @Inject(DiscoveryService) private readonly discovery: DiscoveryService,
    @Inject(ActionHandlerRegistry) private readonly handlers: ActionHandlerRegistry,
  ) {}

  onModuleInit(): void {
    const found = this.discovery
      .getProviders()
      .map((w) => w.instance as object | undefined)
      .filter((i): i is object => !!i && typeof i === 'object' && !!actionIdOf(i.constructor));
    this.handlers.load([...new Set(found)]);
  }
}

@Global()
@Module({})
export class ActionsModule {
  static forRoot(opts: { confirmSecret: string }): DynamicModule {
    return {
      module: ActionsModule,
      global: true,
      imports: [DiscoveryModule],
      providers: [
        { provide: CONFIRM_SECRET, useValue: opts.confirmSecret },
        { provide: AUTHORIZER, inject: [PLATFORM_DB], useFactory: (p: PlatformDb) => new ContextAuthorizer(p) },
        { provide: ActionHandlerRegistry, useFactory: () => new ActionHandlerRegistry(registry) },
        HandlerDiscovery,
        {
          provide: ConfirmTokens,
          inject: [REDIS, CONFIRM_SECRET],
          useFactory: (kv: KeyValueStore, secret: string) => new ConfirmTokens(kv, secret),
        },
        {
          // Sổ thao tác xuyên DB cho action `db: 'platform'` (TIP-045b annex A1) — executor + khôi phục ROLE=jobs dùng chung.
          provide: PlatformOperations,
          inject: [PLATFORM_DB, TENANT_RESOLVER, REDIS, CLOCK, { token: ENC_KEY, optional: true }],
          useFactory: (platform: PlatformDb, resolver: TenantDbResolver, kv: KeyValueStore, clock: Clock, encKey?: Buffer) =>
            new PlatformOperations({ platform, resolver, kv, clock, ...(encKey ? { encKey } : {}) }),
        },
        {
          provide: ActionExecutor,
          inject: [ActionHandlerRegistry, TENANT_RESOLVER, AUTHORIZER, ConfirmTokens, REDIS, CLOCK, PLATFORM_DB, PlatformOperations, { token: ENC_KEY, optional: true }],
          useFactory: (
            handlers: ActionHandlerRegistry,
            resolver: TenantDbResolver,
            authorizer: Authorizer,
            confirm: ConfirmTokens,
            kv: KeyValueStore,
            clock: Clock,
            platform: PlatformDb,
            operations: PlatformOperations,
            encKey?: Buffer,
          ) => {
            const ex = new ActionExecutor({ registry, handlers, resolver, authorizer, confirm, kv, clock, platform, operations, ...(encKey ? { encKey } : {}) });
            operations.useApprovals(() => ex.approvalGateway());
            // Đếm action_total{action,source,result} (TIP-045b) — action ngoài registry ghi `unknown`.
            const ids = new Set(registry.map((a) => a.id));
            return instrumentExecutor(ex, (id) => ids.has(id));
          },
        },
        {
          provide: UndoService,
          inject: [ActionHandlerRegistry, TENANT_RESOLVER, CLOCK, REDIS, PLATFORM_DB],
          useFactory: (h: ActionHandlerRegistry, r: TenantDbResolver, c: Clock, kv: KeyValueStore, p: PlatformDb) => new UndoService(h, r, c, kv, p),
        },
      ],
      exports: [ActionExecutor, UndoService, ActionHandlerRegistry, AUTHORIZER, PlatformOperations],
    };
  }
}
