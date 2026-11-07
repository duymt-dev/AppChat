// TIP-041 (unit): quyết định sau lỗi của lệnh vòng đời (recovery.ts — AC03) + key ring dev / production + thông báo lỗi đã che.
//   - khoá bận → hoãn (pending), không đổi workspace; lệnh bị thay (generation mới) → bỏ lượt
//   - archive lỗi trước manifest → rollback (DB kiểm được → active); còn việc dở → thử lại tới hết lượt
//   - archive lỗi sau manifest → thử lại hoàn tất; hết lượt → recovery_needed (KHÔNG active)
//   - restore lỗi → thử lại; hết lượt → failed, workspace không đổi (vẫn restoring)
// Native dump / restore / drop: apps/api/test/integration/workspace-lifecycle.test.ts.
import { describe, expect, it, vi } from 'vitest';
import { LockUnavailableError } from '@appchat/db';
import { AppError } from '@appchat/shared';
import { ArchiveBusyError, archiveKeysFromEnv, lifecycleErrorCode, processLifecycleJob, type LifecycleJobRow, type LifecycleRunDeps } from '../src';

vi.mock('../src/identity/lifecycle/archive-run', async (orig) => ({ ...(await orig<object>()), runArchive: vi.fn(), rollbackArchive: vi.fn(async () => 'rolled_back') }));
vi.mock('../src/identity/lifecycle/restore-run', async (orig) => ({ ...(await orig<object>()), runRestore: vi.fn() }));
const archiveRun = await import('../src/identity/lifecycle/archive-run');
const restoreRun = await import('../src/identity/lifecycle/restore-run');

const job = (o: Partial<LifecycleJobRow> = {}): LifecycleJobRow => ({
  id: 'j1',
  workspaceId: '0190f000-0000-7000-8000-00000000c041',
  operation: 'archive',
  generation: 2,
  status: 'running',
  step: 'dump',
  expectedVersion: 3,
  attempts: 1,
  manifestId: null,
  ...o,
});

function deps(row: LifecycleJobRow | null) {
  const jobs = { claim: vi.fn(async () => row), retryLater: vi.fn(async () => undefined), finish: vi.fn(async () => undefined) };
  const d = { jobs, log: { warn: vi.fn(), info: vi.fn(), error: vi.fn() } } as unknown as LifecycleRunDeps;
  return { d, jobs };
}

describe('processLifecycleJob — ma trận lỗi', () => {
  it('lệnh không nhận được (người khác giữ lease / đã xong) → skipped', async () => {
    const { d } = deps(null);
    expect(await processLifecycleJob(d, 'j1', 'w')).toBe('skipped');
  });

  it('khoá cluster bận → hoãn, không rollback / finish', async () => {
    const { d, jobs } = deps(job());
    vi.mocked(archiveRun.runArchive).mockRejectedValueOnce(new LockUnavailableError('busy'));
    expect(await processLifecycleJob(d, 'j1', 'w')).toBe('lock_busy');
    expect(jobs.retryLater).toHaveBeenCalledOnce();
    expect(jobs.finish).not.toHaveBeenCalled();
    expect(archiveRun.rollbackArchive).not.toHaveBeenCalled();
  });

  it('lệnh bị thay bởi generation mới → bỏ lượt, không ghi', async () => {
    const { d, jobs } = deps(job());
    vi.mocked(archiveRun.runArchive).mockRejectedValueOnce(new AppError('CONFLICT', 409, { lifecycle: 'superseded' }));
    expect(await processLifecycleJob(d, 'j1', 'w')).toBe('superseded');
    expect(jobs.retryLater).not.toHaveBeenCalled();
    expect(jobs.finish).not.toHaveBeenCalled();
  });

  it('archive còn việc dở (trước manifest) → thử lại; hết lượt → rollback', async () => {
    const a = deps(job({ attempts: 2 }));
    vi.mocked(archiveRun.runArchive).mockRejectedValueOnce(new ArchiveBusyError('runs=1'));
    expect(await processLifecycleJob(a.d, 'j1', 'w')).toBe('retry');
    const b = deps(job({ attempts: 5 }));
    vi.mocked(archiveRun.runArchive).mockRejectedValueOnce(new ArchiveBusyError('runs=1'));
    expect(await processLifecycleJob(b.d, 'j1', 'w')).toBe('rolled_back');
  });

  it('archive lỗi kiểm (trước manifest) → rollback ngay (DB chưa bị đụng)', async () => {
    const { d } = deps(job({ step: 'verify' }));
    vi.mocked(archiveRun.runArchive).mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'ArchiveVerifyError', check: 'checksum' }));
    vi.mocked(archiveRun.rollbackArchive).mockClear();
    expect(await processLifecycleJob(d, 'j1', 'w')).toBe('rolled_back');
    expect(vi.mocked(archiveRun.rollbackArchive).mock.calls[0]![3]).toBe('ArchiveVerifyError:checksum');
  });

  it('archive lỗi SAU manifest (drop / registry) → thử lại; hết lượt → recovery_needed, không đặt active', async () => {
    const a = deps(job({ manifestId: 'm1', step: 'drop', attempts: 1 }));
    vi.mocked(archiveRun.runArchive).mockRejectedValueOnce(new Error('crash'));
    expect(await processLifecycleJob(a.d, 'j1', 'w')).toBe('retry');
    const b = deps(job({ manifestId: 'm1', step: 'registry', attempts: 5 }));
    vi.mocked(archiveRun.runArchive).mockRejectedValueOnce(new Error('crash'));
    vi.mocked(archiveRun.rollbackArchive).mockClear();
    expect(await processLifecycleJob(b.d, 'j1', 'w')).toBe('recovery_needed');
    expect(b.jobs.finish).toHaveBeenCalledWith(expect.anything(), 'w', expect.objectContaining({ status: 'recovery_needed' }));
    expect(b.jobs.finish.mock.calls[0]![2]).not.toHaveProperty('dbStatus', 'active');
    expect(archiveRun.rollbackArchive).not.toHaveBeenCalled();
  });

  it('restore lỗi → thử lại; hết lượt → failed, không đổi db_status', async () => {
    const a = deps(job({ operation: 'restore', attempts: 1 }));
    vi.mocked(restoreRun.runRestore).mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'RestoreError', reason: 'checksum' }));
    expect(await processLifecycleJob(a.d, 'j1', 'w')).toBe('retry');
    const b = deps(job({ operation: 'restore', attempts: 5 }));
    vi.mocked(restoreRun.runRestore).mockRejectedValueOnce(new Error('x'));
    expect(await processLifecycleJob(b.d, 'j1', 'w')).toBe('failed');
    expect(b.jobs.finish.mock.calls[0]![2]).toEqual({ status: 'failed', error: 'Error' });
  });

  it('mã lỗi không chứa đường dẫn / thông điệp thô', () => {
    expect(lifecycleErrorCode(new Error('ENOENT: D:/secret/path'))).toBe('Error');
    expect(lifecycleErrorCode(new LockUnavailableError('lost'))).toBe('LockUnavailableError:lost');
  });
});

describe('key ring lưu trữ', () => {
  const master = Buffer.alloc(32, 7).toString('base64');
  it('dev: dẫn xuất từ APP_ENC_KEY (khác khoá chủ, ổn định); production không có ARCHIVE_KEYS → null', () => {
    const a = archiveKeysFromEnv({ NODE_ENV: 'development', APP_ENC_KEY: master, TENANT_MAINTENANCE_DB: 'postgres' })!;
    const b = archiveKeysFromEnv({ NODE_ENV: 'test', APP_ENC_KEY: master, TENANT_MAINTENANCE_DB: 'postgres' })!;
    expect(a.get(a.currentId)!.equals(b.get(b.currentId)!)).toBe(true);
    expect(a.get(a.currentId)!.equals(Buffer.from(master, 'base64'))).toBe(false);
    expect(archiveKeysFromEnv({ NODE_ENV: 'production', APP_ENC_KEY: master, TENANT_MAINTENANCE_DB: 'postgres' })).toBeNull();
    const k = Buffer.alloc(32, 9).toString('base64');
    expect(archiveKeysFromEnv({ NODE_ENV: 'production', ARCHIVE_KEYS: `p1:${k}`, ARCHIVE_KEY_ID: 'p1', TENANT_MAINTENANCE_DB: 'postgres' })!.currentId).toBe('p1');
  });
});
