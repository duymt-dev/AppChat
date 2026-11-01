// Worker ROLE=jobs của domain `integrations` (TIP-012): xử lý queue `integrations` (gọi ra ngoài qua port, retry, call log).
import { Inject, Module, Optional, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import type { Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import { connectorRegistry } from '@appchat/integrations';
import type { TenantDbResolver } from '@appchat/db';
import { CLOCK, type Clock } from '../../kernel/clock';
import { ENC_KEY } from '../../kernel/crypto';
import { LOGGER } from '../../kernel/kernel.module';
import type { AppLogger } from '../../kernel/logger/logger';
import { REDIS } from '../../kernel/redis';
import { TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import { IntegrationsModule } from '../integrations.module';
import { startIntegrationsWorker } from './integration-call.processor';

class IntegrationsJobsRunner implements OnApplicationBootstrap, OnApplicationShutdown {
  private worker?: Worker;

  constructor(
    @Optional() @Inject(REDIS) private readonly redis: Redis | undefined,
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver | undefined,
    @Optional() @Inject(ENC_KEY) private readonly key: Buffer | undefined,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(LOGGER) private readonly log: AppLogger,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.redis || !this.tenants || !this.key) return;
    this.worker = startIntegrationsWorker(this.redis, { tenants: this.tenants, registry: connectorRegistry, key: this.key, kv: this.redis, now: () => this.clock.now() }, this.log);
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
  }
}

@Module({ imports: [IntegrationsModule], providers: [IntegrationsJobsRunner] })
export class IntegrationsJobsModule {}
