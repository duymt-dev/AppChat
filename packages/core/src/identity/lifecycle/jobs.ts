// Sổ lệnh vòng đời bền (TIP-041 §1): tạo lệnh = CAS `workspace.status_version` + tăng `lifecycle_generation` + chuyển db_status sang
// trạng thái trung gian TRONG một transaction nền tảng (cùng biên nhận / audit của executor). Partial unique `(workspace_id) WHERE status
// IN (pending, running)` → archive / restore / delete đồng thời chỉ một bên thắng. Worker nhận lệnh bằng lease + kiểm generation trước
// mỗi bước ghi; lệnh cũ (generation < workspace.lifecycle_generation) không ghi đè trạng thái mới.
import type { PlatformDb } from '@appchat/db';
import { WORKSPACE_STATUS_SCOPE } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { PlatformTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';
import { bumpRevision } from '../../platform/public';
import { LIFECYCLE_LEASE_MS, type LifecycleJobRow, type LifecycleOp, type LifecycleSource, type LifecycleStatus, type LifecycleStep } from './types';

type Db = Pick<PlatformDb, 'workspace' | 'workspaceLifecycleJob' | 'platformConfigRevision'>;

/** db_status được phép bắt đầu từng lệnh → db_status trung gian. */
const START: Record<'archive' | 'restore', { from: 'active' | 'archived'; to: 'archiving' | 'restoring' }> = {
  archive: { from: 'active', to: 'archiving' },
  restore: { from: 'archived', to: 'restoring' },
};

const isUnique = (e: unknown) => (e as { code?: string })?.code === 'P2002';
const stale = (current: number) => new AppError('CONFLICT', 409, { if_version: 'stale', current_version: String(current) });

/**
 * Tạo lệnh archive / restore trong transaction `tx` (đã giữ dòng workspace bằng UPDATE có điều kiện). `expectedVersion` null = nguồn hệ
 * thống (quét / thành viên mở workspace) — không CAS phiên bản người dùng nhưng vẫn CAS trạng thái.
 */
export async function createLifecycleJob(
  tx: PlatformTx,
  o: { workspaceId: string; op: 'archive' | 'restore'; expectedVersion: number | null; source: LifecycleSource; requestedBy?: string | null; now: Date },
): Promise<{ id: string; generation: number; version: number }> {
  const w = await tx.workspace.findUnique({ where: { id: o.workspaceId }, select: { status: true, dbStatus: true, statusVersion: true, lifecycleGeneration: true } });
  if (!w) throw new AppError('NOT_FOUND', 404, { workspace_id: 'not_found' });
  if (o.expectedVersion !== null && w.statusVersion !== o.expectedVersion) throw stale(w.statusVersion);
  const s = START[o.op];
  // Tạm dừng (status suspended) chặn cả lưu trữ lẫn khôi phục — admin mở lại trước (không tự resume).
  if (w.status !== 'active' || w.dbStatus !== s.from) throw new AppError('INVALID_TRANSITION', 409, { db_status: w.dbStatus, status: w.status });
  const generation = w.lifecycleGeneration + 1;
  const n = await tx.workspace.updateMany({
    where: { id: o.workspaceId, statusVersion: w.statusVersion, status: 'active', dbStatus: s.from, lifecycleGeneration: w.lifecycleGeneration },
    data: { dbStatus: s.to, lifecycleGeneration: generation, statusVersion: { increment: 1 } },
  });
  if (!n.count) throw stale(w.statusVersion);
  const id = uuidv7(o.now.getTime());
  try {
    await tx.workspaceLifecycleJob.create({
      data: { id, workspaceId: o.workspaceId, operation: o.op, generation, status: 'pending', step: 'queued', expectedVersion: w.statusVersion + 1, source: o.source, requestedBy: o.requestedBy ?? null, nextAttemptAt: o.now, createdAt: o.now },
    });
  } catch (e) {
    if (isUnique(e)) throw new AppError('CONFLICT', 409, { workspace: 'operation_in_progress' });
    throw e;
  }
  // Mọi tiến trình bỏ cache registry (resolver chặn mở DB đang lưu trữ / khôi phục ngay).
  await bumpRevision(tx, WORKSPACE_STATUS_SCOPE, o.now);
  return { id, generation, version: w.statusVersion + 1 };
}

export class LifecycleJobs {
  constructor(
    private readonly db: Db & Pick<PlatformDb, '$transaction'>,
    private readonly now: () => Date,
  ) {}

  /** Lệnh đến hạn (pending, hoặc running mà lease hết hạn) — keyset theo `workspace_lifecycle_job_due_idx`. */
  async due(limit = 10): Promise<string[]> {
    const now = this.now();
    const rows = await this.db.workspaceLifecycleJob.findMany({
      where: { status: { in: ['pending', 'running'] }, nextAttemptAt: { lte: now }, OR: [{ status: 'pending' }, { leaseExpiresAt: { lt: now } }] },
      orderBy: [{ nextAttemptAt: 'asc' }, { id: 'asc' }],
      select: { id: true },
      take: limit,
    });
    return rows.map((r) => r.id);
  }

  /** Nhận lease (CAS trạng thái + lease cũ). Lệnh đã xong / người khác đang giữ → null. */
  async claim(id: string, owner: string): Promise<LifecycleJobRow | null> {
    const now = this.now();
    const n = await this.db.workspaceLifecycleJob.updateMany({
      where: { id, status: { in: ['pending', 'running'] }, OR: [{ status: 'pending' }, { leaseExpiresAt: { lt: now } }, { leaseOwner: owner }] },
      data: { status: 'running', leaseOwner: owner, leaseExpiresAt: new Date(now.getTime() + LIFECYCLE_LEASE_MS), attempts: { increment: 1 }, startedAt: now },
    });
    if (!n.count) return null;
    return this.get(id);
  }

  async get(id: string): Promise<LifecycleJobRow | null> {
    const r = await this.db.workspaceLifecycleJob.findUnique({ where: { id } });
    return r ? ({ ...r, operation: r.operation as LifecycleOp, status: r.status as LifecycleStatus, step: r.step as LifecycleStep } as LifecycleJobRow) : null;
  }

  /** Lệnh còn hiệu lực: còn lease của mình + generation vẫn là mới nhất của workspace. Sai → không được làm bước tiếp. */
  async assertCurrent(job: LifecycleJobRow, owner: string): Promise<void> {
    const [j, w] = await Promise.all([
      this.db.workspaceLifecycleJob.findUnique({ where: { id: job.id }, select: { status: true, leaseOwner: true } }),
      this.db.workspace.findUnique({ where: { id: job.workspaceId }, select: { lifecycleGeneration: true } }),
    ]);
    if (!j || j.status !== 'running' || j.leaseOwner !== owner || w?.lifecycleGeneration !== job.generation) throw new AppError('CONFLICT', 409, { lifecycle: 'superseded' });
  }

  /** Ghi bước (+ gia hạn lease) — CAS lease của mình. */
  async step(job: LifecycleJobRow, owner: string, step: LifecycleStep, patch: { manifestId?: string; metrics?: Record<string, number> } = {}): Promise<void> {
    const now = this.now();
    const n = await this.db.workspaceLifecycleJob.updateMany({
      where: { id: job.id, status: 'running', leaseOwner: owner },
      data: { step, leaseExpiresAt: new Date(now.getTime() + LIFECYCLE_LEASE_MS), ...(patch.manifestId ? { manifestId: patch.manifestId } : {}), ...(patch.metrics ? { metrics: patch.metrics } : {}) },
    });
    if (!n.count) throw new AppError('CONFLICT', 409, { lifecycle: 'lease_lost' });
    job.step = step;
    if (patch.manifestId) job.manifestId = patch.manifestId;
  }

  /** Lỗi tạm: trả về pending, thử lại sau (back-off mũ). */
  async retryLater(job: LifecycleJobRow, owner: string, error: string, delayMs: number): Promise<void> {
    await this.db.workspaceLifecycleJob.updateMany({
      where: { id: job.id, status: 'running', leaseOwner: owner },
      data: { status: 'pending', leaseOwner: null, leaseExpiresAt: null, error, nextAttemptAt: new Date(this.now().getTime() + delayMs) },
    });
  }

  /**
   * Kết thúc lệnh + chuyển db_status của workspace trong MỘT transaction, CAS generation (lệnh cũ không ghi đè lệnh mới). `dbStatus`
   * null = không đổi workspace (vd. recovery_needed giữ archiving để admin xử lý).
   */
  async finish(
    job: LifecycleJobRow,
    owner: string,
    o: { status: LifecycleStatus; error?: string | null; dbStatus?: 'active' | 'archived' | null; workspace?: { archivedAt?: Date | null; archiveKey?: string | null; schemaVersion?: string | null; provisionedAt?: Date } },
  ): Promise<void> {
    const now = this.now();
    await this.db.$transaction(async (tx) => {
      const n = await tx.workspaceLifecycleJob.updateMany({
        where: { id: job.id, status: 'running', leaseOwner: owner },
        data: { status: o.status, step: o.status === 'succeeded' ? 'done' : job.step, error: o.error ?? null, leaseOwner: null, leaseExpiresAt: null, finishedAt: now },
      });
      if (!n.count) throw new AppError('CONFLICT', 409, { lifecycle: 'lease_lost' });
      if (!o.dbStatus) return;
      const from = job.operation === 'archive' ? 'archiving' : 'restoring';
      const w = await tx.workspace.updateMany({
        where: { id: job.workspaceId, lifecycleGeneration: job.generation, dbStatus: from },
        data: { dbStatus: o.dbStatus, statusVersion: { increment: 1 }, ...o.workspace },
      });
      if (!w.count) throw new AppError('CONFLICT', 409, { lifecycle: 'superseded' });
      await bumpRevision(tx as PlatformTx, WORKSPACE_STATUS_SCOPE, now);
    });
  }

  /** Lệnh mới nhất của workspace (API trạng thái). */
  latest(workspaceId: string) {
    return this.db.workspaceLifecycleJob.findFirst({
      where: { workspaceId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { id: true, operation: true, generation: true, status: true, step: true, attempts: true, error: true, metrics: true, createdAt: true, finishedAt: true },
    });
  }
}

export { uuidv7 as lifecycleId };
export type LifecycleCreate = Parameters<typeof createLifecycleJob>[1];
export type { LifecycleOp };
