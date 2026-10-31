// Domain `ai` — runtime AI (TIP-019): cấu hình LLM nền tảng (ProviderStore, cache 60 giây), Agent Gateway (`AiSdkEngine` trên
// LlmRouter — hoặc model giả `AI_ENGINE=mock`), chạy / chạy tiếp / huỷ run (AiRunner + RunStore), Cài đặt › Mô hình AI, run.cancel.
// TIP 020–023, 035, 043 thêm kb / agent / approval / assistant / task. Thiếu DB → service null (route trả 501).
import { Module, type OnModuleInit } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { AiSdkEngine, LlmRouter, mockModelSource, type AgentEngine } from '@appchat/ai';
import type { PlatformDb } from '@appchat/db';
import { CreditMeter } from '../billing/public';
import { BillingModule } from '../billing/billing.module';
import { ENC_KEY } from '../kernel/crypto';
import { ENV_SOURCE, LOGGER } from '../kernel/kernel.module';
import type { AppLogger } from '../kernel/logger/logger';
import { REDIS } from '../kernel/redis';
import { PLATFORM_DB } from '../kernel/tenant/tenant.providers';
import { readAiEnv, type AiEnv } from './ai.env';
import { ProviderStore } from './router/provider.store';
import { RunCancelListener } from './runs/cancel.listener';
import { RunCancelHandler } from './runs/run-cancel.handler';
import { AiRunner } from './runs/runner';
import { AiSettingsUpdateHandler } from './settings/ai-settings.handlers';

export const AI_ENV = Symbol('AI_ENV');
export const AGENT_ENGINE = Symbol('AGENT_ENGINE');

const opt = (token: symbol) => ({ token, optional: true });

/** Seed provider từ env lúc boot (Q-001) — lỗi seed không chặn boot, chỉ ghi log. */
class ProviderSeed implements OnModuleInit {
  constructor(
    private readonly store: ProviderStore | null,
    private readonly env: AiEnv,
    private readonly log: AppLogger,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.store || !this.env.LLM_SEED_PROVIDER_KEY) return;
    await this.store.seed(this.env).then(
      (done) => done && this.log.info({ provider: this.env.LLM_SEED_PROVIDER_KEY }, 'llm provider seeded'),
      (err: unknown) => this.log.error({ err }, 'llm provider seed failed'),
    );
  }
}

@Module({
  imports: [BillingModule],
  providers: [
    { provide: AI_ENV, inject: [opt(ENV_SOURCE)], useFactory: (src?: Record<string, string | undefined>) => readAiEnv(src ?? {}) },
    {
      provide: ProviderStore,
      inject: [opt(PLATFORM_DB), opt(ENC_KEY)],
      useFactory: (p?: PlatformDb, k?: Buffer) => (p && k ? new ProviderStore(p, k) : null),
    },
    {
      provide: AGENT_ENGINE,
      inject: [AI_ENV, ProviderStore],
      useFactory: (env: AiEnv, store: ProviderStore | null): AgentEngine | null =>
        env.AI_ENGINE === 'mock' ? new AiSdkEngine(mockModelSource()) : store ? new AiSdkEngine(new LlmRouter(store)) : null,
    },
    {
      provide: AiRunner,
      inject: [AGENT_ENGINE, CreditMeter, LOGGER],
      useFactory: (engine: AgentEngine | null, meter: CreditMeter | null, log: AppLogger) => (engine ? new AiRunner({ engine, meter, log }) : null),
    },
    { provide: ProviderSeed, inject: [ProviderStore, AI_ENV, LOGGER], useFactory: (s: ProviderStore | null, e: AiEnv, l: AppLogger) => new ProviderSeed(s, e, l) },
    { provide: RunCancelListener, inject: [opt(REDIS), AiRunner], useFactory: (r: Redis | undefined, run: AiRunner | null) => new RunCancelListener(r ?? null, run) },
    AiSettingsUpdateHandler,
    RunCancelHandler,
  ],
  exports: [AI_ENV, AGENT_ENGINE, ProviderStore, AiRunner],
})
export class AiModule {}
