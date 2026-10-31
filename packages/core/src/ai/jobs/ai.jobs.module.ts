// BullMQ processor của domain `ai` (worker ROLE=ai). TIP-020: `kb-ingest` (nạp tài liệu kho tri thức). TIP 021–023, 035, 043 thêm
// processor (ai-resume, agent-reply, ai-task…). Thiếu DB / Redis → không chạy.
import { Inject, Module, Optional, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import type { Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import type { Embedder } from '@appchat/ai';
import type { TenantDbResolver } from '@appchat/db';
import { CreditMeter } from '../../billing/public';
import { BillingModule } from '../../billing/billing.module';
import { CLOCK, type Clock } from '../../kernel/clock';
import { FilesService } from '../../kernel/files/files.service';
import { LOGGER } from '../../kernel/kernel.module';
import type { AppLogger } from '../../kernel/logger/logger';
import { REDIS } from '../../kernel/redis';
import { TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import { AiModule } from '../ai.module';
import { KB_EMBEDDER } from '../kb/kb-search.handler';
import type { KbIngestJob } from '../kb/ingest';
import { startKbIngestWorker } from './kb-ingest.processor';

class AiJobsRunner implements OnApplicationBootstrap, OnApplicationShutdown {
  private kb?: Worker<KbIngestJob>;

  constructor(
    @Optional() @Inject(REDIS) private readonly redis: Redis | undefined,
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver | undefined,
    @Optional() @Inject(FilesService) private readonly files: FilesService | undefined,
    @Inject(KB_EMBEDDER) private readonly embedder: Embedder | null,
    @Inject(CreditMeter) private readonly meter: CreditMeter | null,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(LOGGER) private readonly log: AppLogger,
  ) {}

  onApplicationBootstrap(): void {
    const { redis, tenants, files } = this;
    if (!redis || !tenants || !files) return;
    this.kb = startKbIngestWorker(redis, tenants, { files, embedder: this.embedder, meter: this.meter, log: this.log, now: () => this.clock.now() }, this.log);
  }

  async onApplicationShutdown(): Promise<void> {
    await this.kb?.close();
  }
}

export const AI_RUNTIME = AiJobsRunner;

@Module({ imports: [AiModule, BillingModule], providers: [AiJobsRunner] })
export class AiJobsModule {}
