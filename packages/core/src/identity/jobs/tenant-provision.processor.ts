// Job `tenant.provision` (Blueprint §1.3 queue `tenant`, §2.0 vòng đời): CREATE DATABASE từ template → db_status active
// → outbox `workspace.ready` trong DB tenant mới. Idempotent: DB đã có → bỏ qua tạo; registry đã active → không làm lại.
// Seed mặc định: registry seed của kernel (vai trò hệ thống — TIP-005; SLA, loyalty, governance, mẫu — TIP sau), idempotent.
import { Queue } from '../../kernel/jobs/with-job-context';
import { TenantContexts, createTenantDb, withDatabase, type PlatformDb, type TenantDb, type TenantDbResolver, type TenantProvisioner } from '@appchat/db';
import type { Clock } from '../../kernel/clock';
import type { KeyValueStore } from '../../kernel/redis';
import { markDirty, writeOutbox } from '../../kernel/outbox/outbox';
import { runTenantSeeds } from '../../kernel/tenant-seeds';
import type { ProvisionQueue } from '../services/workspaces.service';
import { inEventTransaction } from '../../kernel/outbox/transaction';

export const TENANT_QUEUE = 'tenant';
export const PROVISION_JOB = 'tenant.provision';
export const PROVISION_ATTEMPTS = 3;

export interface ProvisionDeps {
  platform: PlatformDb;
  resolver: TenantDbResolver;
  provisioner: Pick<TenantProvisioner, 'provision'>;
  kv: KeyValueStore;
  clock: Clock;
  /** Mở client tạm tới DB tenant theo tên (seed trước khi `active`), đóng sau khi chạy. */
  seedDb: (dbName: string, fn: (db: TenantDb) => Promise<unknown>) => Promise<void>;
}

/** Một lần provision (gọi từ worker BullMQ hoặc test trực tiếp). */
export async function provisionWorkspace(d: ProvisionDeps, workspaceId: string): Promise<'created' | 'already_active' | 'skipped'> {
  const ws = await d.platform.workspace.findUnique({ where: { id: workspaceId }, select: { dbStatus: true } });
  if (!ws) throw new Error(`workspace ${workspaceId} không tồn tại`);
  if (ws.dbStatus === 'active') return 'already_active';
  // TIP-041: chỉ workspace đang khởi tạo mới được tạo DB từ template — archived / restoring / deleting / suspended KHÔNG BAO GIỜ được
  // tạo DB rỗng rồi đánh active (mất dữ liệu đã lưu trữ). Job provision cũ còn trong hàng đợi gặp trạng thái này → bỏ.
  if (ws.dbStatus !== 'provisioning') return 'skipped';
  const { dbName } = await d.provisioner.provision(workspaceId);
  const now = d.clock.now();
  // Seed qua client trực tiếp tới DB mới (resolver chỉ mở DB `active`) — xong seed mới đặt active để không ai vào DB thiếu vai trò.
  await d.seedDb(dbName, async (db) => runTenantSeeds(db, { workspaceId, now }));
  // CAS trạng thái: chỉ provisioning → active (lệnh khác đã đổi trạng thái trong lúc tạo DB thì không ghi đè).
  const n = await d.platform.workspace.updateMany({ where: { id: workspaceId, dbStatus: 'provisioning' }, data: { dbName, dbStatus: 'active', provisionedAt: now } });
  if (!n.count) return 'skipped';
  d.resolver.invalidate(workspaceId);
  const tenant = await d.resolver.get(TenantContexts.system(workspaceId, 'tenant.provision'));
  await inEventTransaction(tenant, workspaceId, (tx) => writeOutbox(tx, workspaceId, [{ topic: 'workspace.ready', payload: { workspace_id: workspaceId } }], now));
  await markDirty(d.kv, workspaceId);
  return 'created';
}

/** Client tạm tới DB tenant mới (role appchat_tenant_app) cho bước seed — dùng chung worker + test. */
export const tenantSeedDb =
  (tenantBaseUrl: string) =>
  async (dbName: string, fn: (db: TenantDb) => Promise<unknown>): Promise<void> => {
    const db = createTenantDb(withDatabase(tenantBaseUrl, dbName), 1);
    try {
      await fn(db);
    } finally {
      await db.$disconnect();
    }
  };

/** Producer cho api: `jobId = workspaceId` (không trùng), retry back-off 3 lần (DC-021). */
export class BullProvisionQueue implements ProvisionQueue {
  constructor(private readonly queue: Queue) {}
  async enqueue(workspaceId: string): Promise<void> {
    await this.queue.add(PROVISION_JOB, { workspace_id: workspaceId }, {
      jobId: `provision-${workspaceId}`,
      attempts: PROVISION_ATTEMPTS,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
  }

  /** Job đã hết lượt thử → `failed` cho endpoint provisioning. */
  async failed(workspaceId: string): Promise<boolean> {
    return (await this.queue.getJobState(`provision-${workspaceId}`)) === 'failed';
  }

  async close(): Promise<void> {
    await this.queue.close();
  }
}

// Worker queue `tenant`: `TenantQueueDispatcher` (identity/lifecycle/dispatcher.ts — TIP-041) phân job provision / lifecycle theo tên.
