// Chạy một lệnh `delete` (TIP-041 §4, DC-245, DC-376). Thứ tự bất biến (cùng khoá cluster / lease / generation như lưu trữ):
//   1. DB còn (từ active / suspended): quiesce như lưu trữ (resolver đã chặn vì `deleting`) → sao lưu mã hoá + đọc lại kiểm → manifest
//      `deletion` hạn = lúc xoá + 30 ngày. Từ archived: không dump — dùng manifest đã kiểm (DB đã DROP từ lúc lưu trữ).
//   2. DROP DATABASE (idempotent, trên kết nối giữ khoá).
//   3. Tombstone trong MỘT transaction nền tảng: db_status `deleted` + deleted_at; MỌI manifest chưa purge của workspace (mọi thế hệ, không
//      chỉ archive_key hiện tại) chuyển `deletion` + hạn (trừ bản đang legal hold — giữ nguyên lý do); thu hồi membership / lời mời / phiên
//      route kênh + widget + bank feed; subscription → cancelled (không hoàn tiền tự động — DC-376). Giữ hoá
//      đơn / sổ ví / audit. Registry + manifest còn → purge / khôi phục được trong hạn.
// Lỗi TRƯỚC DROP: DB còn nguyên → trả về đúng trạng thái trước (`from_db_status`), lệnh failed. Sau DROP: thử lại tới tombstone, không bao
// giờ trả về active.
import { OperationLock, TABLE_COUNT_SQL, assertTenantDbName, clusterUrl, tenantDbName, withDatabase } from '@appchat/db';
import type { PlatformTx } from '../../kernel/actions/action-context';
import { ArchiveBusyError, BUSY_SQL, dumpToManifest, one, type ArchiveRunDeps } from './archive-run';
import { DELETION_RETENTION_DAYS } from './delete-preview';
import type { LifecycleJobRow } from './types';

const DAY = 86_400_000;
export const deletionExpiry = (at: Date) => new Date(at.getTime() + DELETION_RETENTION_DAYS * DAY);

export async function runDelete(d: ArchiveRunDeps, job: LifecycleJobRow, owner: string): Promise<'deleted'> {
  const ws = await d.platform.workspace.findUniqueOrThrow({ where: { id: job.workspaceId }, select: { dbName: true, dbHost: true, schemaVersion: true } });
  const dbName = assertTenantDbName(ws.dbName);
  if (dbName !== tenantDbName(job.workspaceId)) throw new Error('db_name lệch tenantDbName(workspace)');
  const cluster = { adminUrl: d.infra.provisionerUrl, allowedHosts: d.infra.allowedHosts, maintenanceDb: d.infra.maintenanceDb };
  const lock = await OperationLock.acquire(cluster, job.workspaceId, ws.dbHost);
  try {
    await d.jobs.assertCurrent(job, owner);
    // Hạn sao lưu tính từ lúc Owner xác nhận xoá (tạo lệnh) — chạy lại không kéo dài hạn.
    const expiresAt = deletionExpiry(job.createdAt ?? d.now());
    // Đã có bản sao lưu xoá (chạy lại sau crash) hoặc DB đã lưu trữ từ trước → không dump (DB có thể đã mất).
    const live = job.fromDbStatus !== 'archived' && !job.manifestId;
    if (live) {
      await d.jobs.step(job, owner, 'quiesce');
      d.invalidate(job.workspaceId);
      if (d.settleMs > 0) await new Promise((r) => setTimeout(r, d.settleMs));
      await d.stopChannels(job.workspaceId);
      const adminDb = clusterUrl(cluster, ws.dbHost, dbName);
      const busy = await one<{ runs: number; sends: number }>(adminDb, BUSY_SQL);
      if (busy && (busy.runs || busy.sends)) throw new ArchiveBusyError(`runs=${busy.runs} sends=${busy.sends}`);
      const tables = (await one<{ n: number }>(adminDb, TABLE_COUNT_SQL))?.n ?? 0;
      job.manifestId = await dumpToManifest(d, job, owner, lock, dbName, ws, tables, { expiresAt });
    } else if (job.fromDbStatus === 'archived') {
      // Phải còn ít nhất một bản lưu trữ đã kiểm trong kho — không xoá registry khi không còn gì để khôi phục trong hạn.
      const m = await d.platform.archiveManifest.findFirst({ where: { workspaceId: job.workspaceId, purgedAt: null }, orderBy: { createdAt: 'desc' }, select: { storageKey: true, cipherBytes: true } });
      if (!m || (await d.infra.store.size(m.storageKey)) !== Number(m.cipherBytes)) throw new Error('không còn bản lưu trữ kiểm được');
    }
    await d.jobs.assertCurrent(job, owner);
    await d.jobs.step(job, owner, 'drop');
    await lock.dropDatabase(dbName, 'tenant');
    await d.jobs.step(job, owner, 'tombstone');
    const now = d.now();
    await d.jobs.finish(job, owner, { status: 'succeeded', dbStatus: 'deleted', workspace: { deletedAt: now }, also: (tx) => tombstone(tx, job.workspaceId, now, expiresAt) });
    d.invalidate(job.workspaceId);
    return 'deleted';
  } finally {
    await lock.release();
  }
}

/** Tombstone (cùng transaction kết thúc lệnh): giữ registry tối thiểu + manifest; thu hồi mọi đường truy cập; không xoá dữ liệu tài chính. */
export async function tombstone(tx: PlatformTx, ws: string, now: Date, expiresAt: Date): Promise<void> {
  // Mọi thế hệ lưu trữ chuyển retention xoá, TRỪ bản đang legal hold (giữ nguyên retention + lý do — gỡ hold là quyết định của người có
  // thẩm quyền, có audit; hold chỉ giữ đúng bản đó, không kéo dài cả workspace — các bản khác vẫn purge đúng hạn).
  await tx.archiveManifest.updateMany({ where: { workspaceId: ws, purgedAt: null, retentionKind: 'indefinite', holdReason: null }, data: { retentionKind: 'deletion', expiresAt } });
  const members = await tx.membership.findMany({ where: { workspaceId: ws, status: { not: 'removed' } }, select: { userId: true } });
  await tx.membership.updateMany({ where: { workspaceId: ws, status: { not: 'removed' } }, data: { status: 'removed' } });
  await tx.invite.updateMany({ where: { workspaceId: ws, revokedAt: null, acceptedAt: null }, data: { revokedAt: now } });
  // Workspace đang dùng của thành viên trỏ vào workspace đã xoá → bỏ (lần đăng nhập sau chọn workspace khác / tạo mới).
  await tx.user.updateMany({ where: { id: { in: members.map((m) => m.userId) }, lastWorkspaceId: ws }, data: { lastWorkspaceId: null } });
  await tx.tenantChannelRoute.deleteMany({ where: { workspaceId: ws } });
  await tx.tenantWidgetRoute.deleteMany({ where: { workspaceId: ws } });
  await tx.tenantBankFeedRoute.deleteMany({ where: { workspaceId: ws } });
  await tx.subscription.updateMany({ where: { workspaceId: ws, status: { in: ['trialing', 'active', 'expired'] } }, data: { status: 'cancelled' } });
  await tx.workspaceFreezeRequest.updateMany({ where: { workspaceId: ws, status: 'pending' }, data: { status: 'cancelled', decisionReason: 'workspace_deleted', decidedAt: now, version: { increment: 1 } } });
}

/** Lỗi TRƯỚC DROP của lệnh xoá: DB còn → trả về đúng trạng thái trước lệnh (active / suspended / archived), lệnh failed. */
export async function rollbackDelete(d: ArchiveRunDeps, job: LifecycleJobRow, owner: string, error: string): Promise<'rolled_back' | 'recovery_needed'> {
  const back = job.fromDbStatus;
  if (back !== 'active' && back !== 'suspended' && back !== 'archived') {
    await d.jobs.finish(job, owner, { status: 'recovery_needed', error: `${error}; from_unknown` });
    return 'recovery_needed';
  }
  if (back !== 'archived') {
    const ws = await d.platform.workspace.findUniqueOrThrow({ where: { id: job.workspaceId }, select: { dbName: true, dbHost: true } });
    try {
      await one(withDatabase(d.infra.tenantAppUrl, assertTenantDbName(ws.dbName), ws.dbHost), 'SELECT 1');
    } catch {
      await d.jobs.finish(job, owner, { status: 'recovery_needed', error: `${error}; db_unreachable` });
      return 'recovery_needed';
    }
  }
  // Bản sao lưu xoá dở (đã ghi manifest nhưng chưa DROP) là bản thừa — giữ tới hạn 30 ngày rồi purge (không xoá ngay: có thể đang đọc).
  await d.jobs.finish(job, owner, { status: 'failed', error, dbStatus: back });
  d.invalidate(job.workspaceId);
  return 'rolled_back';
}
