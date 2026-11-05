// Chạy một việc dữ liệu (TIP-045b annex D): giành lease → kiểm lại quyền người tạo (thành viên còn hoạt động + quyền action gốc) → xử lý
// lô bản ghi pending theo keyset, mỗi lô gia hạn lease + kiểm `cancelling` (huỷ hợp tác ở ranh giới bản ghi, phần đã ghi giữ nguyên) →
// kết thúc theo biên nhận. Domain đăng ký runner theo `kind` (sửa từng bản ghi qua executor — không gọi thẳng handler; hoặc chạy toàn bộ
// cho xuất tệp). Mất lease giữa chừng → dừng, worker đang giữ làm tiếp.
import type { TenantDb } from '@appchat/db';
import type { AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../actions/action-context';
import { writeOutbox } from '../outbox/outbox';
import { ITEM_BATCH, claimJob, finishJob, jobStatus, markItem, nextItems, renewJob, saveProgress, type JobLease } from './data-jobs/store';

type Db = Pick<TenantDb, 'dataJob' | 'dataJobItem' | '$transaction'>;

export interface JobRow {
  id: string;
  kind: string;
  actionId: string;
  actorId: string | null;
  input: unknown;
  fieldPolicy: string;
}

export interface KindContext {
  ws: string;
  db: TenantDb;
  job: JobRow;
  /** Quyền HIỆN TẠI của người tạo việc (null = không còn là thành viên). */
  authz: AuthzContext;
  now: () => Date;
}

export interface KindRunner {
  /** Một bản ghi (sửa hàng loạt) trong transaction riêng CÙNG biên nhận — chạy lại / hai worker không ghi lần hai. Lỗi ném ra = failed. */
  item?: (c: KindContext, tx: TenantTx, targetId: string, seq: number) => Promise<'done' | 'skipped'>;
  /** Toàn bộ việc (xuất tệp) — tự đọc biên nhận / ghi tệp; `shouldStop` để huỷ hợp tác. */
  whole?: (c: KindContext, l: JobLease, shouldStop: () => Promise<boolean>) => Promise<{ status: 'completed' | 'cancelled'; fileKey?: string; fileName?: string; expiresAt?: Date }>;
  /** Nhãn ngắn trong thông báo xong việc + đường dẫn trong app (mặc định không link). */
  label: string;
  link?: (jobId: string) => string;
}

const KINDS = new Map<string, KindRunner>();
export const registerDataJobKind = (kind: string, r: KindRunner) => void KINDS.set(kind, r);
export const dataJobKinds = () => [...KINDS.keys()];

export interface RunDeps {
  /** Quyền hiện tại của người tạo việc trong workspace (null = không còn thành viên hoạt động). */
  authzOf: (ws: string, userId: string | null) => Promise<AuthzContext | null>;
  /** Người tạo còn quyền của action gốc. */
  allowed: (authz: AuthzContext, actionId: string) => boolean;
  now: () => Date;
  owner: string;
}

export type RunOutcome = 'completed' | 'cancelled' | 'failed' | 'busy' | 'skipped' | 'lost';

export async function runDataJob(db: TenantDb, ws: string, jobId: string, d: RunDeps): Promise<RunOutcome> {
  const lease = await claimJob(db as Db, jobId, d.owner, d.now());
  if (!lease) {
    const st = await jobStatus(db, jobId);
    // Không có / đã kết thúc → bỏ qua (event lặp, quét muộn); còn mở = worker khác đang giữ lease.
    return st === null || ['completed', 'cancelled', 'failed'].includes(st) ? 'skipped' : 'busy';
  }
  const job = (await db.dataJob.findUnique({ where: { id: jobId }, select: { id: true, kind: true, actionId: true, actorId: true, input: true, fieldPolicy: true, status: true } }))!;
  const kind = KINDS.get(job.kind);
  const finish = (status: 'completed' | 'cancelled' | 'failed', error: string | null = null, file: FileOut = {}) => end(db, ws, lease, job, kind, status, d, error, file);
  if (job.status === 'cancelling') return finish('cancelled');
  if (!kind) return finish('failed', 'unknown_kind');
  // Quyền hiện tại của người tạo: bị gỡ / mất quyền → dừng phần còn lại (không ghi thêm dưới quyền cũ).
  const authz = await d.authzOf(ws, job.actorId);
  if (!authz || !d.allowed(authz, job.actionId)) return finish('failed', 'forbidden');
  const ctx: KindContext = { ws, db, job, authz, now: d.now };
  const stop = async () => {
    if (!(await renewJob(db, lease, d.now()))) return true;
    return (await jobStatus(db, jobId)) === 'cancelling';
  };
  if (kind.whole) {
    let r: Awaited<ReturnType<NonNullable<KindRunner['whole']>>>;
    try {
      r = await kind.whole(ctx, lease, stop);
    } catch (err) {
      return finish('failed', errorCode(err));
    }
    if (r.status === 'cancelled' && !(await stillMine(db, lease))) return 'lost';
    return finish(r.status, null, r);
  }
  let after = -1;
  for (;;) {
    if (await stop()) return (await jobStatus(db, jobId)) === 'cancelling' && (await stillMine(db, lease)) ? finish('cancelled') : 'lost';
    const batch = await nextItems(db, jobId, after, ITEM_BATCH);
    if (!batch.length) break;
    for (const it of batch) {
      try {
        await db.$transaction(async (tx) => {
          const st = await kind.item!(ctx, tx as TenantTx, it.targetId, it.seq);
          // Biên nhận cùng commit với phần ghi: bản ghi đã có biên nhận (worker khác / lần trước) → huỷ phần ghi lần này.
          if (!(await markItem(tx, jobId, it.seq, st, null, d.now()))) throw new ItemTaken();
        });
      } catch (err) {
        if (!(err instanceof ItemTaken)) await markItem(db, jobId, it.seq, 'failed', errorCode(err), d.now());
      }
      after = it.seq;
    }
    await saveProgress(db, lease, d.now());
  }
  return finish('completed');
}

class ItemTaken extends Error {}

/** Mã lỗi an toàn cho biên nhận (mã AppError + trường, không có dữ liệu bản ghi). */
const errorCode = (err: unknown) => {
  const e = err as { code?: string; fields?: Record<string, unknown> };
  return e.code ? `${e.code}${e.fields ? `:${Object.keys(e.fields).join(',')}` : ''}` : 'error';
};

type FileOut = { fileKey?: string; fileName?: string; expiresAt?: Date };

const stillMine = async (db: TenantDb, l: JobLease) => (await db.dataJob.count({ where: { id: l.id, leaseOwner: l.owner, fence: l.fence } })) === 1;

/** Kết thúc đúng fence + báo người tạo (cùng transaction — mất fence thì không ghi gì, không báo trùng). */
async function end(db: TenantDb, ws: string, l: JobLease, job: JobRow, kind: KindRunner | undefined, status: 'completed' | 'cancelled' | 'failed', d: RunDeps, error: string | null, file: FileOut): Promise<RunOutcome> {
  const now = d.now();
  const ok = await db.$transaction(async (tx) => {
    if (!(await finishJob(tx as never, l, status, now, { error, ...file }))) return false;
    if (job.actorId) {
      const t = await tx.dataJob.findUnique({ where: { id: l.id }, select: { done: true, total: true } });
      const link = kind?.link?.(l.id);
      await writeOutbox(tx, ws, [{ topic: 'notify.requested', payload: { kind: 'data_job_done', to: { user_ids: [job.actorId] }, params: { job: kind?.label ?? job.kind, status, done: t?.done ?? 0, total: t?.total ?? 0 }, ...(link ? { link } : {}) } }], now);
    }
    return true;
  });
  return ok ? status : 'lost';
}
