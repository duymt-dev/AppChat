// Sổ việc dữ liệu nặng (TIP-045b annex D) trên DB tenant: tạo việc với tập id CHỐT + hash input, giành lease (chủ + hạn + fence — worker
// khác chỉ giành khi hết hạn), đọc lô pending theo keyset (seq), ghi biên nhận từng bản ghi, đếm lại từ biên nhận, kết thúc / huỷ hợp tác
// / thử lại các bản ghi lỗi. Không có logic domain — runner của từng loại (registry) làm phần ghi.
import { createHash } from 'node:crypto';
import type { TenantDb } from '@appchat/db';
import type { DataJobStatus } from '@appchat/shared';
import type { TenantTx } from '../../actions/action-context';
import { uuidv7 } from '../../ids';

export const JOB_LEASE_MS = 60_000;
export const ITEM_BATCH = 50;

type Db = Pick<TenantDb, 'dataJob' | 'dataJobItem' | '$transaction'>;

/** Hash input chuẩn hoá (khoá sắp xếp) — thử lại chỉ với cùng input. */
export function inputHash(v: unknown): string {
  const canon = (x: unknown): unknown =>
    x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b)).map(([k, y]) => [k, canon(y)])) : Array.isArray(x) ? x.map(canon) : x;
  return createHash('sha256').update(JSON.stringify(canon(v))).digest('hex');
}

export interface NewJob {
  kind: string;
  actionId: string;
  actorId: string | null;
  actionLogId: string | null;
  input: unknown;
  /** Id bản ghi đích đã chốt (thứ tự = seq). */
  targets: string[];
  fieldPolicy?: string;
  /** Thế hệ biên nhận (TIP-034c: 0 = thao tác đi, 1 = lượt hoàn tác của nó). */
  generation?: number;
  /** Lượt hoàn tác trỏ về thao tác đi (duy nhất). */
  parentJobId?: string;
  /** Version đã nhận theo id (TIP-034c — con so khớp trước khi ghi). */
  admitted?: ReadonlyMap<string, number>;
  now: Date;
}

/** Tạo việc + biên nhận pending cho từng id (trong transaction của action — cùng commit với action_log). */
export async function createJob(tx: Pick<TenantTx, 'dataJob' | 'dataJobItem'>, j: NewJob): Promise<string> {
  const id = uuidv7(j.now.getTime());
  await tx.dataJob.create({
    data: { id, kind: j.kind, actionId: j.actionId, actorId: j.actorId, actionLogId: j.actionLogId, inputHash: inputHash(j.input), input: j.input as object, fieldPolicy: j.fieldPolicy ?? '', total: j.targets.length, parentJobId: j.parentJobId ?? null, createdAt: j.now, updatedAt: j.now },
  });
  for (let i = 0; i < j.targets.length; i += 1000) {
    await tx.dataJobItem.createMany({ data: j.targets.slice(i, i + 1000).map((targetId, k) => ({ jobId: id, seq: i + k, targetId, generation: j.generation ?? 0, admittedVersion: j.admitted?.get(targetId) ?? null, updatedAt: j.now })) });
  }
  return id;
}

export interface JobLease {
  id: string;
  owner: string;
  fence: number;
}

/** Giành lease: việc chưa xong + (không chủ | hết hạn | chính mình). Trả fence mới; null = đang có worker khác. */
export async function claimJob(db: Db, id: string, owner: string, now: Date): Promise<JobLease | null> {
  return db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ status: string; lease_owner: string | null; lease_until: Date | null; fence: number }[]>`
      SELECT status, lease_owner, lease_until, fence FROM data_job WHERE id = ${id}::uuid FOR UPDATE`;
    const j = rows[0];
    if (!j || !['queued', 'running', 'cancelling'].includes(j.status)) return null;
    if (j.lease_owner && j.lease_owner !== owner && j.lease_until && j.lease_until > now) return null;
    const fence = j.fence + 1;
    await tx.dataJob.update({ where: { id }, data: { leaseOwner: owner, leaseUntil: new Date(now.getTime() + JOB_LEASE_MS), fence, ...(j.status === 'queued' ? { status: 'running' } : {}), updatedAt: now } });
    return { id, owner, fence };
  });
}

/** Gia hạn đúng chủ + fence; false = mất lease (worker khác đã giành) → dừng ghi. */
export async function renewJob(db: Pick<TenantDb, 'dataJob'>, l: JobLease, now: Date): Promise<boolean> {
  const r = await db.dataJob.updateMany({ where: { id: l.id, leaseOwner: l.owner, fence: l.fence }, data: { leaseUntil: new Date(now.getTime() + JOB_LEASE_MS), updatedAt: now } });
  return r.count === 1;
}

/** Lô pending kế tiếp theo seq (keyset — index partial `data_job_item_pending_idx`). */
export async function nextItems(db: Pick<TenantDb, 'dataJobItem'>, jobId: string, afterSeq: number, limit = ITEM_BATCH) {
  return db.dataJobItem.findMany({ where: { jobId, status: 'pending', seq: { gt: afterSeq } }, orderBy: { seq: 'asc' }, take: limit, select: { seq: true, targetId: true } });
}

/** Ghi biên nhận một bản ghi — chỉ từ pending (chạy lại không ghi đè kết quả cũ). */
export async function markItem(db: Pick<TenantDb, 'dataJobItem'>, jobId: string, seq: number, status: 'done' | 'failed' | 'skipped', error: string | null, now: Date) {
  const r = await db.dataJobItem.updateMany({ where: { jobId, seq, status: 'pending' }, data: { status, error: error?.slice(0, 300) ?? null, updatedAt: now } });
  return r.count === 1;
}

/** Đếm lại từ biên nhận (nguồn sự thật tiến độ). */
export async function tallyJob(db: Pick<TenantDb, 'dataJobItem'>, jobId: string) {
  const g = await db.dataJobItem.groupBy({ by: ['status'], where: { jobId }, _count: { _all: true } });
  const n = (s: string) => g.find((x) => x.status === s)?._count._all ?? 0;
  return { done: n('done') + n('skipped'), failed: n('failed'), pending: n('pending') };
}

export async function jobStatus(db: Pick<TenantDb, 'dataJob'>, id: string): Promise<DataJobStatus | null> {
  return ((await db.dataJob.findUnique({ where: { id }, select: { status: true } }))?.status as DataJobStatus | undefined) ?? null;
}

/** Cập nhật tiến độ (đúng fence). */
export async function saveProgress(db: Pick<TenantDb, 'dataJob' | 'dataJobItem'>, l: JobLease, now: Date) {
  const t = await tallyJob(db, l.id);
  await db.dataJob.updateMany({ where: { id: l.id, fence: l.fence }, data: { done: t.done, failed: t.failed, updatedAt: now } });
  return t;
}

/** Kết thúc (đúng chủ + fence; false = đã mất lease): completed / cancelled / failed + nhả lease. */
export async function finishJob(db: Pick<TenantDb, 'dataJob' | 'dataJobItem'>, l: JobLease, status: 'completed' | 'cancelled' | 'failed', now: Date, extra: { error?: string | null; fileKey?: string; fileName?: string; expiresAt?: Date } = {}) {
  const t = await tallyJob(db, l.id);
  const r = await db.dataJob.updateMany({
    where: { id: l.id, leaseOwner: l.owner, fence: l.fence },
    data: { status, done: t.done, failed: t.failed, error: extra.error ?? null, leaseOwner: null, leaseUntil: null, finishedAt: now, updatedAt: now, ...(extra.fileKey ? { fileKey: extra.fileKey, fileName: extra.fileName ?? null, expiresAt: extra.expiresAt ?? null } : {}) },
  });
  return r.count === 1;
}
