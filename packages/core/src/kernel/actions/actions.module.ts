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
import { actionIdOf } from './handler';
import { ActionHandlerRegistry } from './handler-registry';
import { UndoService } from './undo.service';

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
          provide: ActionExecutor,
          inject: [ActionHandlerRegistry, TENANT_RESOLVER, AUTHORIZER, ConfirmTokens, REDIS, CLOCK, PLATFORM_DB],
          useFactory: (
            handlers: ActionHandlerRegistry,
            resolver: TenantDbResolver,
            authorizer: Authorizer,
            confirm: ConfirmTokens,
            kv: KeyValueStore,
            clock: Clock,
            platform: PlatformDb,
          ) => new ActionExecutor({ registry, handlers, resolver, authorizer, confirm, kv, clock, platform }),
        },
        {
          provide: UndoService,
          inject: [ActionHandlerRegistry, TENANT_RESOLVER, CLOCK],
          useFactory: (h: ActionHandlerRegistry, r: TenantDbResolver, c: Clock) => new UndoService(h, r, c),
        },
      ],
      exports: [ActionExecutor, UndoService, ActionHandlerRegistry, AUTHORIZER],
    };
  }
}
