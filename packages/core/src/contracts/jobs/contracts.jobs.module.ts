// Worker ROLE=jobs của domain `contracts` (TIP-030): scheduler `contracts.sweep` mỗi 15 phút trên queue riêng `contracts-scheduler`
// (như sales — DC-173): link ký quá hạn → `declined`, T-30 nhắc gia hạn (một lần), qua ngày kết thúc → `expired`. Lỗi một workspace
// (DB chưa nâng migration…) không chặn workspace khác. TIP-030c: thêm khôi phục ký hợp đồng cha (signing/recovery.ts).
import { Inject, Module, Optional, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { Queue, Worker } from '../../kernel/jobs/with-job-context';
import type { Redis } from 'ioredis';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import { CLOCK, type Clock } from '../../kernel/clock';
import { LOGGER } from '../../kernel/kernel.module';
import type { AppLogger } from '../../kernel/logger/logger';
import { REDIS } from '../../kernel/redis';
import { PLATFORM_DB, TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import { ContractsModule } from '../contracts.module';
import { ActionExecutor } from '../../kernel/actions/executor';
import { expireContracts, expireLinks, remindRenewal } from '../services/contract-system';
import { expireAppendixLinks } from '../appendix/expiry';
import { recoverSigning } from '../signing/recovery';
import type { SignMailDeps } from '../signing/delivery';
import { SIGNING_RECIPIENTS, type SigningRecipients } from '../signing/recipients';
import { ContractDeps } from '../services/contract-deps';

export const CONTRACTS_SCHEDULER_QUEUE = 'contracts-scheduler';
export const CONTRACT_SWEEP_JOB = 'contracts.sweep';
const EVERY_MS = 15 * 60_000;

export async function sweepContracts(d: { platform: Pick<PlatformDb, 'workspace'>; tenants: TenantDbResolver; executor: Pick<ActionExecutor, 'execute'>; now: () => Date; onError?: (ws: string, err: unknown) => void; signing?: SignMailDeps | null }) {
  const wss = await d.platform.workspace.findMany({ where: { dbStatus: 'active' }, select: { id: true, timezone: true, locale: true } });
  const r = { declined: 0, reminded: 0, expired: 0 };
  for (const w of wss) {
    try {
      const db = await d.tenants.get(TenantContexts.system(w.id, CONTRACT_SWEEP_JOB));
      const now = d.now();
      const sys = { executor: d.executor, tenants: d.tenants, onError: (_id: string, err: unknown) => d.onError?.(w.id, err) };
      r.declined += await expireLinks(db, w.id, now, sys);
      r.reminded += await remindRenewal(db, w.id, now, w.timezone, sys);
      r.expired += await expireContracts(db, w.id, now, w.timezone, sys);
      // Phụ lục (TIP-030b F3) sau cùng: lỗi riêng phần phụ lục không chặn quét hợp đồng của workspace.
      r.declined += await expireAppendixLinks(db, now, w.locale);
      // TIP-030c: lần ký bỏ dở hết hạn + dọn ứng viên chưa xác nhận + gửi / chốt ý định OTP Owner (không bao giờ chốt hộ lần ký).
      await recoverSigning(db, w.id, d.signing ?? null, now).catch((err) => d.onError?.(w.id, err));
    } catch (err) {
      d.onError?.(w.id, err);
    }
  }
  return r;
}

class ContractsJobsRunner implements OnApplicationBootstrap, OnApplicationShutdown {
  private queue?: Queue;
  private worker?: Worker;

  constructor(
    @Optional() @Inject(REDIS) private readonly redis: Redis | undefined,
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | undefined,
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver | undefined,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(LOGGER) private readonly log: AppLogger,
    @Optional() @Inject(ActionExecutor) private readonly executor: ActionExecutor | undefined,
    @Optional() @Inject(ContractDeps) private readonly contracts: ContractDeps | undefined,
    @Optional() @Inject(SIGNING_RECIPIENTS) private readonly recipients: SigningRecipients | null | undefined,
  ) {}

  private signing(): SignMailDeps | null {
    const c = this.contracts;
    if (!c?.env || !this.recipients) return null;
    return { mail: c.mail, key: c.env.key, recipient: this.recipients.of, place: (ws) => c.place(ws), now: () => this.clock.now() };
  }

  async onApplicationBootstrap(): Promise<void> {
    if (!this.redis || !this.platform || !this.tenants || !this.executor) return;
    const deps = { platform: this.platform, tenants: this.tenants, executor: this.executor, signing: this.signing(), now: () => this.clock.now(), onError: (ws: string, err: unknown) => this.log.warn({ err, ws, job: CONTRACT_SWEEP_JOB }, 'quét hợp đồng lỗi ở workspace') };
    this.queue = new Queue(CONTRACTS_SCHEDULER_QUEUE, { connection: this.redis.duplicate() });
    await this.queue.upsertJobScheduler(CONTRACT_SWEEP_JOB, { every: EVERY_MS }, { name: CONTRACT_SWEEP_JOB });
    this.worker = new Worker(
      CONTRACTS_SCHEDULER_QUEUE,
      async (job) => {
        if (job.name !== CONTRACT_SWEEP_JOB) return;
        const r = await sweepContracts(deps);
        if (r.declined || r.reminded || r.expired) this.log.info({ job: CONTRACT_SWEEP_JOB, ...r }, 'quét hợp đồng');
      },
      { connection: this.redis.duplicate(), concurrency: 1 },
    );
    this.worker.on('failed', (job, err) => this.log.warn({ err, job: job?.name }, 'contracts scheduler lỗi'));
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }
}

@Module({ imports: [ContractsModule], providers: [ContractsJobsRunner] })
export class ContractsJobsModule {}
