// Đăng ký khôi phục usage AI + kỹ năng tiện ích AI vào lịch khôi phục 045b (TIP-019b §2.4, TIP-019c §3.7). Nạp ở BillingJobsModule
// (ROLE=jobs — có DB nền tảng, tenant, ví) — không nạp AiJobsModule vào ROLE=jobs, không lịch riêng.
import { Inject, Injectable, Optional, type OnApplicationBootstrap } from '@nestjs/common';
import type { PlatformDb, TenantDbResolver } from '@appchat/db';
import { CreditMeter } from '../../billing/services/credit-meter';
import { CLOCK, type Clock } from '../../kernel/clock';
import { registerRecoveryAdapter } from '../../kernel/consistency/operation-recovery';
import { LOGGER } from '../../kernel/kernel.module';
import type { AppLogger } from '../../kernel/logger/logger';
import { PLATFORM_DB, TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import { recoverUsage } from './usage-recovery';
import { recoverUtilities } from '../skills/utility-recovery';
import { makeRevalidate } from '../skills/utility-revalidate';
import { utilityValidatorOf } from '../skills/utility-validators';

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

export const AI_UTILITY_RECOVERY = 'ai.utility';

@Injectable()
export class AiUtilityRecoveryInstaller implements OnApplicationBootstrap {
  constructor(
    @Optional() @Inject(PLATFORM_DB) private readonly platform: Pick<PlatformDb, 'workspace'> | undefined,
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver | undefined,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(LOGGER) private readonly log: AppLogger,
  ) {}

  onApplicationBootstrap(): void {
    const { platform, tenants } = this;
    if (!platform || !tenants) return;
    const revalidate = makeRevalidate(tenants, platform, utilityValidatorOf);
    registerRecoveryAdapter(AI_UTILITY_RECOVERY, async (now) => {
      const r = await recoverUtilities({ platform, tenants, revalidate, now: now ?? (() => this.clock.now()), onError: (ws, err) => this.log.warn({ err, ws }, 'khôi phục kỹ năng tiện ích AI lỗi ở workspace') });
      return { validated: r.validated, invalidated: r.invalidated, failed: r.failed, unknown: r.unknown };
    });
  }
}
