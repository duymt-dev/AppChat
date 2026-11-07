// TIP-041 P3 (unit): xác thực bước hai + ma trận lỗi lệnh xoá + chốt purge (AC06 / AC07). Native dump / DROP / tombstone + HTTP:
// apps/api/test/integration/workspace-lifecycle-delete.test.ts.
//   - step-up: chỉ lưu HMAC (mã rõ không có trong băm, khác khoá → khác băm); hạn mức xin mã; tiêu: sai người / hết hạn / khoá / stale /
//     sai mã (đếm lần sai qua bumpFail) / đúng mã tiêu đúng một lần
//   - recovery delete: lỗi trước DROP → việc dở thử lại, hết lượt / lỗi khác → rollback về from_db_status; từ bước drop → thử lại, hết lượt
//     → recovery_needed (không bao giờ rollback)
//   - purge: bỏ qua workspace chưa tombstone và khoá không thuộc workspace; xoá tệp trước rồi đánh purged_at
import { describe, expect, it, vi } from 'vitest';
import { AppError } from '@appchat/shared';
import { ArchiveBusyError, consumeStepUp, deletionExpiry, issueStepUp, processLifecycleJob, purgeExpired, stepUpHash, type LifecycleJobRow, type LifecycleRunDeps } from '../src';

vi.mock('../src/identity/lifecycle/delete-run', async (orig) => ({ ...(await orig<object>()), runDelete: vi.fn(), rollbackDelete: vi.fn(async () => 'rolled_back') }));
const deleteRun = await import('../src/identity/lifecycle/delete-run');

const KEY = Buffer.alloc(32, 7);
const WS = '0190f000-0000-7000-8000-00000000c041';
const NOW = new Date('2026-11-07T03:00:00.000Z');

type Row = { id: string; userId: string; workspaceId: string; operation: string; previewHash: string; expectedVersion: number; codeHash: string; attempts: number; expiresAt: Date; consumedAt: Date | null };
function stepDb(recent = 0) {
  const rows = new Map<string, Row>();
  const tx = {
    workspaceStepUp: {
      count: vi.fn(async () => recent),
      updateMany: vi.fn(async ({ where, data }: { where: { id?: string; consumedAt?: null; userId?: string }; data: { consumedAt: Date } }) => {
        let n = 0;
        for (const r of rows.values()) {
          if ((where.id && r.id !== where.id) || r.consumedAt !== null) continue;
          r.consumedAt = data.consumedAt;
          n++;
        }
        return { count: n };
      }),
      create: vi.fn(async ({ data }: { data: Row }) => void rows.set(data.id, { ...data, attempts: 0, consumedAt: null })),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => rows.get(where.id) ?? null),
    },
  };
  return { tx: tx as never, rows };
}
const issue = (tx: never) => issueStepUp(tx, KEY, { workspaceId: WS, userId: 'u1', operation: 'delete_workspace', previewHash: 'h1', expectedVersion: 3, now: NOW }, '424242');
const consume = (tx: never, id: string, o: Partial<{ userId: string; previewHash: string; currentVersion: number; code: string; now: Date }> = {}, bump = vi.fn(async () => undefined)) =>
  consumeStepUp(tx, KEY, { challengeId: id, workspaceId: WS, userId: 'u1', operation: 'delete_workspace', previewHash: 'h1', currentVersion: 3, code: '424242', now: NOW, ...o }, bump);
const reason = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return (e as AppError).fields?.otp ?? (e as AppError).code;
  }
  return 'ok';
};

describe('step-up OTP', () => {
  it('chỉ lưu HMAC có khoá; khoá khác → băm khác', async () => {
    const { tx, rows } = stepDb();
    const c = await issue(tx);
    const row = rows.get(c.id)!;
    expect(row.codeHash).toBe(stepUpHash(KEY, c.id, '424242'));
    expect(row.codeHash).not.toContain('424242');
    expect(stepUpHash(Buffer.alloc(32, 8), c.id, '424242')).not.toBe(row.codeHash);
    expect(c.expiresAt.getTime() - NOW.getTime()).toBe(5 * 60_000);
  });

  it('quá 5 lần xin mã / 15 phút → RATE_LIMITED', async () => {
    const { tx } = stepDb(5);
    expect(await reason(issue(tx))).toBe('RATE_LIMITED');
  });

  it('sai người / sai mã (đếm lần sai) / stale / hết hạn / khoá; đúng mã tiêu một lần', async () => {
    const { tx, rows } = stepDb();
    const c = await issue(tx);
    expect(await reason(consume(tx, c.id, { userId: 'u2' }))).toBe('invalid');
    const bump = vi.fn(async () => undefined);
    expect(await reason(consume(tx, c.id, { code: '000000' }, bump))).toBe('invalid');
    expect(bump).toHaveBeenCalledWith(c.id);
    expect(await reason(consume(tx, c.id, { previewHash: 'h2' }))).toBe('stale');
    expect(await reason(consume(tx, c.id, { currentVersion: 4 }))).toBe('stale');
    expect(await reason(consume(tx, c.id, { now: new Date(NOW.getTime() + 5 * 60_000) }))).toBe('expired');
    rows.get(c.id)!.attempts = 5;
    expect(await reason(consume(tx, c.id))).toBe('locked');
    rows.get(c.id)!.attempts = 0;
    expect(await reason(consume(tx, c.id))).toBe('ok');
    expect(await reason(consume(tx, c.id))).toBe('expired');
  });

  it('xin mã mới → mã cũ chết', async () => {
    const { tx } = stepDb();
    const a = await issue(tx);
    await issue(tx);
    expect(await reason(consume(tx, a.id))).toBe('expired');
  });

  it('hạn sao lưu = lúc xác nhận + 30 ngày', () => {
    expect(deletionExpiry(NOW).toISOString()).toBe('2026-12-07T03:00:00.000Z');
  });
});

const job = (o: Partial<LifecycleJobRow> = {}): LifecycleJobRow => ({
  id: 'j1',
  workspaceId: WS,
  operation: 'delete',
  generation: 2,
  status: 'running',
  step: 'backup',
  expectedVersion: 3,
  attempts: 1,
  manifestId: null,
  fromDbStatus: 'suspended',
  ...o,
});
function deps(row: LifecycleJobRow) {
  const jobs = { claim: vi.fn(async () => row), retryLater: vi.fn<(...a: unknown[]) => Promise<void>>(async () => undefined), finish: vi.fn<(...a: unknown[]) => Promise<void>>(async () => undefined) };
  return { d: { jobs, log: { warn: vi.fn(), info: vi.fn(), error: vi.fn() } } as unknown as LifecycleRunDeps, jobs };
}

describe('processLifecycleJob — lệnh xoá', () => {
  it('lỗi trước DROP: việc dở thử lại; lỗi khác → rollback về trạng thái trước', async () => {
    const a = deps(job());
    vi.mocked(deleteRun.runDelete).mockRejectedValueOnce(new ArchiveBusyError('runs=1'));
    expect(await processLifecycleJob(a.d, 'j1', 'w')).toBe('retry');
    expect(deleteRun.rollbackDelete).not.toHaveBeenCalled();
    const b = deps(job({ manifestId: 'm1' }));
    vi.mocked(deleteRun.runDelete).mockRejectedValueOnce(new Error('pg_dump exit 1'));
    expect(await processLifecycleJob(b.d, 'j1', 'w')).toBe('rolled_back');
    expect(deleteRun.rollbackDelete).toHaveBeenCalledOnce();
  });

  it('từ bước drop: thử lại; hết lượt → recovery_needed, không rollback', async () => {
    vi.mocked(deleteRun.rollbackDelete).mockClear();
    const a = deps(job({ step: 'drop' }));
    vi.mocked(deleteRun.runDelete).mockRejectedValueOnce(new Error('connection reset'));
    expect(await processLifecycleJob(a.d, 'j1', 'w')).toBe('retry');
    const b = deps(job({ step: 'tombstone', attempts: 99 }));
    vi.mocked(deleteRun.runDelete).mockRejectedValueOnce(new Error('connection reset'));
    expect(await processLifecycleJob(b.d, 'j1', 'w')).toBe('recovery_needed');
    expect(b.jobs.finish).toHaveBeenCalledWith(expect.anything(), 'w', expect.objectContaining({ status: 'recovery_needed' }));
    expect(deleteRun.rollbackDelete).not.toHaveBeenCalled();
  });
});

describe('purgeExpired', () => {
  it('chỉ workspace đã tombstone + khoá đúng gốc; xoá tệp trước khi đánh purged_at', async () => {
    const other = '0190f000-0000-7000-8000-00000000c099';
    const m = (id: string, ws: string, key = `${ws}/g1-${id}.acar`) => ({ id, workspaceId: ws, storageKey: key, expiresAt: NOW });
    const ids = ['0190f000-0000-7000-8000-0000000000a1', '0190f000-0000-7000-8000-0000000000a2', '0190f000-0000-7000-8000-0000000000a3'];
    const order: string[] = [];
    const platform = {
      archiveManifest: {
        findMany: vi.fn().mockResolvedValueOnce([m(ids[0]!, WS), m(ids[1]!, other), m(ids[2]!, WS, `${other}/g1-${ids[2]}.acar`)]),
        updateMany: vi.fn(async () => (order.push('mark'), { count: 1 })),
      },
      workspace: { findMany: vi.fn(async () => [{ id: WS }]) },
    };
    const store = { remove: vi.fn(async () => void order.push('remove')) };
    const r = await purgeExpired({ platform: platform as never, infra: { store: store as never }, files: null, now: () => NOW });
    expect(r).toEqual({ manifests: 1, skipped: 2, workspaceFiles: 0 });
    expect(store.remove).toHaveBeenCalledOnce();
    expect(order).toEqual(['remove', 'mark']);
  });
});
