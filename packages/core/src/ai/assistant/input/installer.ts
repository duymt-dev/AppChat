// Đăng ký worker tệp đầu vào cho ROLE=ai (TIP-023f §1.5, §5.1) — provider riêng để ai.jobs.module chỉ thêm một dòng. Bundle parser lấy
// từ PARSER_ENTRY (mặc định dist/parser.cjs cạnh main.js của worker), launcher native từ PARSER_LAUNCHER; thiếu bundle thì processor
// vẫn chạy nhưng mọi tệp kết thúc `parser_isolation_unavailable` (không parse trong tiến trình chính).
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Inject, Injectable, Optional, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import type { Redis } from 'ioredis';
import type { TenantDbResolver } from '@appchat/db';
import { CLOCK, type Clock } from '../../../kernel/clock';
import { REDIS } from '../../../kernel/redis';
import { TENANT_RESOLVER } from '../../../kernel/tenant/tenant.providers';
import { STORAGE, type Storage } from '../../../kernel/files/storage';
import { LOGGER } from '../../../kernel/kernel.module';
import type { AppLogger } from '../../../kernel/logger/logger';
import { startAssistantInputWorker } from './processor';

/** Bundle parser mặc định: cạnh entry tiến trình (worker dist/main.js → dist/parser.cjs). */
export function parserEntry(env: NodeJS.ProcessEnv = process.env, main = process.argv[1] ?? ''): string | null {
  if (env.PARSER_ENTRY) return env.PARSER_ENTRY;
  const near = join(dirname(main), 'parser.cjs');
  return existsSync(near) ? near : null;
}

@Injectable()
export class AssistantInputInstaller implements OnApplicationBootstrap, OnApplicationShutdown {
  private worker?: { close(): Promise<void> };

  constructor(
    @Optional() @Inject(REDIS) private readonly redis: Redis | undefined,
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver | undefined,
    @Optional() @Inject(STORAGE) private readonly storage: Storage | undefined,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(LOGGER) private readonly log: AppLogger,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.redis || !this.tenants || !this.storage) return;
    const sandbox = { entry: parserEntry(), launcher: process.env.PARSER_LAUNCHER || null };
    if (!sandbox.entry) this.log.warn({}, 'assistant-input: chưa có bundle parser cô lập — tệp sẽ báo parser_isolation_unavailable');
    this.worker = await startAssistantInputWorker(this.redis, { tenants: this.tenants, storage: this.storage, sandbox, now: () => this.clock.now(), log: this.log });
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
  }
}
