// Điều phối một lệnh vòng đời + ma trận lỗi (TIP-041 §2 / §3, AC03). Một chỗ quyết định sau lỗi:
//   - khoá đang bận / lệnh bị thay (generation mới) → bỏ lượt này (lệnh khác đang / sẽ chạy), không đổi trạng thái
//   - archive lỗi TRƯỚC khi có manifest (quiesce / dump / verify) → việc dở (busy) thử lại có back-off; lỗi khác hoặc hết lượt → rollback
//     active nếu DB kiểm được (DB chưa bị đụng)
//   - archive lỗi SAU khi có manifest (drop / registry) → thử lại hoàn tất; hết lượt → recovery_needed (không báo active khi DB có thể đã mất)
//   - restore lỗi → thử lại (DB tạm của thế hệ đã dọn); hết lượt → failed, workspace giữ `restoring` (admin xem lỗi, không mở DB nửa vời)
import { LockUnavailableError } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { AppLogger } from '../../kernel/logger/logger';
import { ArchiveBusyError, rollbackArchive, runArchive, type ArchiveRunDeps } from './archive-run';
import { runRestore, type RestoreRunDeps } from './restore-run';
import { LIFECYCLE_MAX_ATTEMPTS } from './types';

export type LifecycleRunDeps = ArchiveRunDeps & RestoreRunDeps & { log: AppLogger };

const backoff = (attempt: number) => Math.min(15 * 60_000, 5_000 * 2 ** Math.max(0, attempt - 1));
/** Mã lỗi gọn cho API trạng thái (không đường dẫn / mật khẩu / lệnh). */
export const lifecycleErrorCode = (e: unknown): string => {
  if (e instanceof AppError) return `${e.code}`.toLowerCase();
  const n = (e as Error)?.name ?? 'error';
  const reason = (e as { reason?: string; check?: string }).reason ?? (e as { check?: string }).check;
  return reason ? `${n}:${reason}` : n;
};

export async function processLifecycleJob(d: LifecycleRunDeps, jobId: string, owner: string): Promise<string> {
  const job = await d.jobs.claim(jobId, owner);
  if (!job) return 'skipped';
  try {
    if (job.operation === 'archive') return await runArchive(d, job, owner);
    if (job.operation === 'restore') return (await runRestore(d, job, owner), 'restored');
    await d.jobs.finish(job, owner, { status: 'failed', error: 'operation_not_supported' });
    return 'unsupported';
  } catch (e) {
    const code = lifecycleErrorCode(e);
    d.log.warn({ job: job.id, ws: job.workspaceId, op: job.operation, step: job.step, attempt: job.attempts, err: code }, 'workspace lifecycle step failed');
    if (e instanceof LockUnavailableError && e.reason === 'busy') {
      await d.jobs.retryLater(job, owner, code, backoff(1));
      return 'lock_busy';
    }
    if (e instanceof AppError && (e.fields as Record<string, string> | undefined)?.lifecycle) return 'superseded';
    const last = job.attempts >= LIFECYCLE_MAX_ATTEMPTS;
    if (job.operation === 'archive') {
      if (job.manifestId) {
        if (!last) return (await d.jobs.retryLater(job, owner, code, backoff(job.attempts)), 'retry');
        await d.jobs.finish(job, owner, { status: 'recovery_needed', error: code });
        return 'recovery_needed';
      }
      if (e instanceof ArchiveBusyError && !last) return (await d.jobs.retryLater(job, owner, code, backoff(job.attempts)), 'retry');
      return rollbackArchive(d, job, owner, code);
    }
    if (!last) return (await d.jobs.retryLater(job, owner, code, backoff(job.attempts)), 'retry');
    await d.jobs.finish(job, owner, { status: 'failed', error: code });
    return 'failed';
  }
}
