// Domain `integrations` (TIP-012, provider-ports): kết nối connector của workspace (bí mật AES-256-GCM), resolver theo port,
// đọc trang Nền tảng kết nối, webhook router, queue `integrations` (producer). Thiếu khoá / DB / Redis → service null.
import { Module, type OnApplicationShutdown } from '@nestjs/common';
import { Queue } from 'bullmq';
import type { Redis } from 'ioredis';
import { connectorRegistry } from '@appchat/integrations';
import type { PlatformDb, TenantDbResolver } from '@appchat/db';
import { CLOCK, type Clock } from '../kernel/clock';
import { ENC_KEY } from '../kernel/crypto';
import { REDIS } from '../kernel/redis';
import { PLATFORM_DB, TENANT_RESOLVER } from '../kernel/tenant/tenant.providers';
import { IntegrationConnectHandler } from './actions/integration-connect.handler';
import { IntegrationDisconnectHandler } from './actions/integration-disconnect.handler';
import { IntegrationRegisterInterestHandler } from './actions/integration-register-interest.handler';
import { INTEGRATIONS_QUEUE, IntegrationCalls } from './jobs/integration-call.processor';
import { ConnectionsService } from './services/connections.service';
import { IntegrationsReadService } from './services/read.service';
import { IntegrationResolver } from './services/resolver';
import { IntegrationWebhooks } from './services/webhook.service';

const opt = (token: symbol) => ({ token, optional: true });

class CallsCloser implements OnApplicationShutdown {
  constructor(private readonly q: Queue | null) {}
  async onApplicationShutdown(): Promise<void> {
    await this.q?.close();
  }
}

const INTEGRATIONS_CALL_QUEUE = Symbol('INTEGRATIONS_CALL_QUEUE');

@Module({
  providers: [
    IntegrationConnectHandler,
    IntegrationDisconnectHandler,
    IntegrationRegisterInterestHandler,
    {
      provide: ConnectionsService,
      inject: [opt(PLATFORM_DB), opt(ENC_KEY), CLOCK],
      useFactory: (p: PlatformDb | undefined, k: Buffer | undefined, c: Clock) => (p && k ? new ConnectionsService(connectorRegistry, p, k, () => c.now()) : null),
    },
    {
      provide: IntegrationResolver,
      inject: [opt(TENANT_RESOLVER), opt(ENC_KEY)],
      useFactory: (r: TenantDbResolver | undefined, k: Buffer | undefined) => (r && k ? new IntegrationResolver(r, connectorRegistry, k) : null),
    },
    { provide: IntegrationsReadService, inject: [opt(PLATFORM_DB)], useFactory: (p?: PlatformDb) => (p ? new IntegrationsReadService(connectorRegistry, p) : null) },
    {
      provide: IntegrationWebhooks,
      inject: [opt(PLATFORM_DB), opt(TENANT_RESOLVER), opt(ENC_KEY), opt(REDIS), CLOCK],
      useFactory: (p: PlatformDb | undefined, r: TenantDbResolver | undefined, k: Buffer | undefined, kv: Redis | undefined, c: Clock) =>
        p && r && k && kv ? new IntegrationWebhooks(p, r, connectorRegistry, k, kv, () => c.now()) : null,
    },
    { provide: INTEGRATIONS_CALL_QUEUE, inject: [opt(REDIS)], useFactory: (r?: Redis) => (r ? new Queue(INTEGRATIONS_QUEUE, { connection: r.duplicate() }) : null) },
    { provide: IntegrationCalls, inject: [INTEGRATIONS_CALL_QUEUE], useFactory: (q: Queue | null) => (q ? new IntegrationCalls(q) : null) },
    { provide: 'INTEGRATIONS_CALLS_CLOSER', inject: [INTEGRATIONS_CALL_QUEUE], useFactory: (q: Queue | null) => new CallsCloser(q) },
  ],
  exports: [ConnectionsService, IntegrationResolver, IntegrationsReadService, IntegrationWebhooks, IntegrationCalls],
})
export class IntegrationsModule {}
