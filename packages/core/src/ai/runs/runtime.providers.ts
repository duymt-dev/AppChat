// Đăng ký khôi phục usage AI vào lịch khôi phục 045b (TIP-019b §2.4). Nạp ở BillingJobsModule (ROLE=jobs — có DB nền tảng, tenant,
// ví) — không nạp AiJobsModule vào ROLE=jobs, không lịch riêng.
import { Inject, Injectable, Optional, type OnApplicationBootstrap } from '@nestjs/common';
import type { PlatformDb, TenantDbResolver } from '@appchat/db';
import { CreditMeter } from '../../billing/services/credit-meter';
import { CLOCK, type Clock } from '../../kernel/clock';
import { registerRecoveryAdapter } from '../../kernel/consistency/operation-recovery';
import { LOGGER } from '../../kernel/kernel.module';
import type { AppLogger } from '../../kernel/logger/logger';
import { PLATFORM_DB, TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import { recoverUsage } from './usage-recovery';

export const AI_USAGE_RECOVERY = 'ai.usage';

@Injectable()
export class AiUsageRecoveryInstaller implements OnApplicationBootstrap {
  constructor(
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | undefined,
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver | undefined,
    @Optional() @Inject(CreditMeter) private readonly meter: CreditMeter | null | undefined,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(LOGGER) private readonly log: AppLogger,
  ) {}

  onApplicationBootstrap(): void {
    const { platform, tenants } = this;
    const wallet = this.meter?.usage;
    if (!platform || !tenants || !wallet) return;
    registerRecoveryAdapter(AI_USAGE_RECOVERY, async (now) => {
      const r = await recoverUsage({ platform, tenants, wallet, now: now ?? (() => this.clock.now()), onError: (ws, err) => this.log.warn({ err, ws }, 'khôi phục usage AI lỗi ở workspace') });
      return { settled: r.settled, unresolved: r.unresolved };
    });
  }
}
