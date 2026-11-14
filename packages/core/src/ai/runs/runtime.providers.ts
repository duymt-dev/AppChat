// Đăng ký khôi phục usage AI + kỹ năng tiện ích AI vào lịch khôi phục 045b (TIP-019b §2.4, TIP-019c §3.7). Nạp ở BillingJobsModule
// (ROLE=jobs — có DB nền tảng, tenant, ví) — không nạp AiJobsModule vào ROLE=jobs, không lịch riêng.
import { Inject, Injectable, Optional, type OnApplicationBootstrap } from '@nestjs/common';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
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
import { recoverProposals } from '../assistant/record-intent/publication';
import { recoverDrafts } from '../agents/drafting/publication';
import { recoverCitations } from '../citations/recovery';

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
    // TIP-021b: binding soạn agent quá lease — chưa có chữ → `rejected` USAGE_UNKNOWN (không gọi lại); có chữ bỏ dở → vô hiệu sau 24 giờ.
    registerRecoveryAdapter(AI_DRAFT_RECOVERY, async (now) => {
      const at = (now ?? (() => this.clock.now()))();
      const out = { unknown: 0, abandoned: 0 };
      for (const w of await platform.workspace.findMany({ where: { dbStatus: 'active' }, select: { id: true } })) {
        try {
          const db = await tenants.get(TenantContexts.system(w.id, 'ai.draft-recovery'));
          const r = await db.$transaction((tx) => recoverDrafts(tx as never, at, DRAFT_ABANDON_MS));
          out.unknown += r.unknown;
          out.abandoned += r.abandoned;
        } catch (err) {
          this.log.warn({ err, ws: w.id }, 'khôi phục bản soạn agent lỗi ở workspace');
        }
      }
      return out;
    });
    registerRecoveryAdapter(AI_RECORD_PROPOSAL_RECOVERY, async (now) => {
      const at = (now ?? (() => this.clock.now()))();
      const out = { unknown: 0, abandoned: 0 };
      for (const w of await platform.workspace.findMany({ where: { dbStatus: 'active' }, select: { id: true } })) {
        try {
          const db = await tenants.get(TenantContexts.system(w.id, 'ai.record-proposal-recovery'));
          const r = await db.$transaction((tx) => recoverProposals(tx as never, at, DRAFT_ABANDON_MS));
          out.unknown += r.unknown;
          out.abandoned += r.abandoned;
        } catch (err) {
          this.log.warn({ err, ws: w.id }, 'khôi phục đề xuất theo bản ghi lỗi ở workspace');
        }
      }
      return out;
    });
    // TIP-020d: binding trích dẫn câu trả lời mở quá lease — kiểm lại cục bộ ứng viên đã lưu (không gọi provider), không gửi khách.
    registerRecoveryAdapter(AI_CITATION_RECOVERY, async (now) => {
      const at = (now ?? (() => this.clock.now()))();
      const out = { validated: 0, invalidated: 0, failed: 0 };
      for (const w of await platform.workspace.findMany({ where: { dbStatus: 'active' }, select: { id: true } })) {
        try {
          const r = await recoverCitations(await tenants.get(TenantContexts.system(w.id, 'ai.citation-recovery')), at);
          out.validated += r.validated;
          out.invalidated += r.invalidated;
          out.failed += r.failed;
        } catch (err) {
          this.log.warn({ err, ws: w.id }, 'khôi phục trích dẫn câu trả lời lỗi ở workspace');
        }
      }
      return out;
    });
  }
}

export const AI_DRAFT_RECOVERY = 'ai.agent_draft';
/** TIP-020d: binding trích dẫn câu trả lời kênh (validated_citations). */
export const AI_CITATION_RECOVERY = 'ai.answer_citations';
/** TIP-023g: binding đề xuất theo bản ghi (validated_record) — cùng luật: sinh dở → USAGE_UNKNOWN, chữ kiểm dở quá 24 giờ → vô hiệu. */
export const AI_RECORD_PROPOSAL_RECOVERY = 'ai.record_proposal';
/** Binding đã có chữ model nhưng không ai gửi lại cùng request_id trong 24 giờ → vô hiệu + xoá chữ thô (TIP-021b §3.6). */
const DRAFT_ABANDON_MS = 86_400_000;

