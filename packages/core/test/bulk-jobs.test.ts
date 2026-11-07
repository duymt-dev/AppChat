// TIP-045b annex D — việc dữ liệu nặng: runner kernel (bulk-dispatch) trên DB giả trong bộ nhớ. Đủ biên nhận từng bản ghi + báo người tạo
// một lần; chạy lại / event lặp không ghi lần hai; huỷ hợp tác ở ranh giới lô (phần đã ghi giữ nguyên); mất lease → dừng, không kết thúc
// thay worker mới; người tạo mất quyền → failed `forbidden`, không ghi bản ghi nào; lỗi một bản ghi chỉ hỏng bản ghi đó. CSV chặn công thức.
import { describe, expect, it } from 'vitest';
import { AppError, type AuthzContext } from '@appchat/shared';
import { registerDataJobKind, runDataJob, type RunDeps } from '../src/kernel/jobs/bulk-dispatch';
import { inputHash, ITEM_BATCH } from '../src/kernel/jobs/data-jobs/store';
import { csvCell } from '../src/crm/services/contact-export';

type Row = Record<string, unknown>;
type Where = Record<string, unknown>;

const match = (r: Row, w: Where = {}): boolean =>
  Object.entries(w).every(([k, v]) => {
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      const o = v as { gt?: number; lt?: Date; in?: unknown[] };
      if ('gt' in o) return (r[k] as number) > o.gt!;
      if ('lt' in o) return (r[k] as Date) < o.lt!;
      if ('in' in o) return o.in!.includes(r[k]);
    }
    return r[k] === v;
  });

function fakeDb(itemCount: number, job: Row = {}) {
  const jobs: Row[] = [{ id: 'j1', kind: 'test.kind', actionId: 'contact.bulk_update', actorId: 'u1', input: {}, fieldPolicy: '', status: 'queued', leaseOwner: null, leaseUntil: null, fence: 0, done: 0, failed: 0, total: itemCount, ...job }];
  const items: Row[] = Array.from({ length: itemCount }, (_, seq) => ({ jobId: 'j1', seq, targetId: `t${seq}`, status: 'pending', error: null }));
  const outbox: Row[] = [];
  const updMany = (rows: Row[]) => async ({ where, data }: { where: Where; data: Row }) => {
    const hit = rows.filter((r) => match(r, where));
    hit.forEach((r) => Object.assign(r, data));
    return { count: hit.length };
  };
  const db = {
    $queryRaw: async () => jobs.map((j) => ({ status: j.status, lease_owner: j.leaseOwner, lease_until: j.leaseUntil, fence: j.fence })),
    dataJob: {
      findUnique: async ({ where }: { where: Where }) => jobs.find((j) => match(j, where)) ?? null,
      update: async ({ where, data }: { where: Where; data: Row }) => Object.assign(jobs.find((j) => match(j, where))!, data),
      updateMany: updMany(jobs),
      count: async ({ where }: { where: Where }) => jobs.filter((j) => match(j, where)).length,
    },
    dataJobItem: {
      findMany: async ({ where, take }: { where: Where; take: number }) => items.filter((i) => match(i, where)).sort((a, b) => (a.seq as number) - (b.seq as number)).slice(0, take),
      updateMany: updMany(items),
      groupBy: async ({ where }: { where: Where }) => {
        const by = new Map<string, number>();
        for (const i of items.filter((x) => match(x, where))) by.set(i.status as string, (by.get(i.status as string) ?? 0) + 1);
        return [...by].map(([status, n]) => ({ status, _count: { _all: n } }));
      },
    },
    outboxEvent: { createMany: async ({ data }: { data: Row[] }) => void outbox.push(...data) },
    $transaction: async (fn: (tx: unknown) => unknown) => fn(db),
  };
  return { db: db as never, job: jobs[0]!, items, outbox };
}

const AUTHZ = { userId: 'u1', isOwner: false, permissions: new Set(['crm.edit']) } as unknown as AuthzContext;
const deps = (over: Partial<RunDeps> = {}): RunDeps => ({ authzOf: async () => AUTHZ, allowed: () => true, now: () => new Date('2026-11-05T10:00:00Z'), owner: 'w1', ...over });

let seen: string[] = [];
let onItem: (target: string, f: ReturnType<typeof fakeDb>) => Promise<'done' | 'skipped'> = async () => 'done';
let current: ReturnType<typeof fakeDb>;
registerDataJobKind('test.kind', {
  label: 'Thử',
  item: async (_c, _tx, targetId) => {
    seen.push(targetId);
    return onItem(targetId, current);
  },
});

const setup = (n: number, job?: Row) => {
  seen = [];
  onItem = async () => 'done';
  current = fakeDb(n, job);
  return current;
};

describe('runDataJob', () => {
  it('60 bản ghi: đủ biên nhận, đếm từ biên nhận, báo người tạo một lần; chạy lại / event lặp → skipped, không ghi thêm', async () => {
    const f = setup(60);
    expect(await runDataJob(f.db, 'ws', 'j1', deps())).toBe('completed');
    expect(seen).toHaveLength(60);
    expect(f.items.every((i) => i.status === 'done')).toBe(true);
    expect(f.job).toMatchObject({ status: 'completed', done: 60, failed: 0, leaseOwner: null });
    expect(f.outbox).toHaveLength(1);
    expect(f.outbox[0]).toMatchObject({ topic: 'notify.requested', payload: { kind: 'data_job_done', to: { user_ids: ['u1'] }, params: { done: 60, total: 60, status: 'completed' } } });
    expect(await runDataJob(f.db, 'ws', 'j1', deps())).toBe('skipped');
    expect(seen).toHaveLength(60);
    expect(f.outbox).toHaveLength(1);
  });

  it('worker khác còn lease → busy, không chạm bản ghi', async () => {
    const f = setup(5, { status: 'running', leaseOwner: 'w2', leaseUntil: new Date('2026-11-05T10:05:00Z'), fence: 3 });
    expect(await runDataJob(f.db, 'ws', 'j1', deps())).toBe('busy');
    expect(seen).toHaveLength(0);
  });

  it('lease hết hạn (worker chết) → worker mới giành, fence + 1, làm tiếp từ biên nhận (bản ghi đã xong không chạy lại)', async () => {
    const f = setup(10, { status: 'running', leaseOwner: 'dead', leaseUntil: new Date('2026-11-05T09:00:00Z'), fence: 2 });
    f.items.slice(0, 4).forEach((i) => (i.status = 'done'));
    expect(await runDataJob(f.db, 'ws', 'j1', deps())).toBe('completed');
    expect(seen).toEqual(['t4', 't5', 't6', 't7', 't8', 't9']);
    expect(f.job).toMatchObject({ fence: 3, done: 10 });
  });

  it('huỷ giữa chừng: dừng ở ranh giới lô, phần đã ghi giữ nguyên, còn lại pending; kết thúc cancelled', async () => {
    const f = setup(ITEM_BATCH + 10);
    onItem = async (t, x) => {
      if (t === 't3') x.job.status = 'cancelling';
      return 'done';
    };
    expect(await runDataJob(f.db, 'ws', 'j1', deps())).toBe('cancelled');
    expect(seen).toHaveLength(ITEM_BATCH);
    expect(f.items.filter((i) => i.status === 'pending')).toHaveLength(10);
    expect(f.job).toMatchObject({ status: 'cancelled', done: ITEM_BATCH });
  });

  it('mất lease giữa chừng (worker khác giành) → lost: không kết thúc, không báo thay worker mới', async () => {
    const f = setup(ITEM_BATCH + 5);
    onItem = async (t, x) => {
      if (t === 't1') Object.assign(x.job, { leaseOwner: 'w2', fence: 99 });
      return 'done';
    };
    expect(await runDataJob(f.db, 'ws', 'j1', deps())).toBe('lost');
    expect(f.job.status).toBe('running');
    expect(f.outbox).toHaveLength(0);
  });

  it('người tạo mất quyền / không còn thành viên → failed forbidden, không ghi bản ghi nào', async () => {
    const f = setup(5);
    expect(await runDataJob(f.db, 'ws', 'j1', deps({ allowed: () => false }))).toBe('failed');
    expect(f.job).toMatchObject({ status: 'failed', error: 'forbidden' });
    expect(seen).toHaveLength(0);
    const g = setup(5);
    expect(await runDataJob(g.db, 'ws', 'j1', deps({ authzOf: async () => null }))).toBe('failed');
    expect(g.items.every((i) => i.status === 'pending')).toBe(true);
  });

  it('lỗi một bản ghi chỉ hỏng bản ghi đó (mã an toàn); bản ghi đã có biên nhận do worker khác → không ghi đè', async () => {
    const f = setup(4);
    onItem = async (t, x) => {
      if (t === 't1') throw new AppError('SCOPE_FORBIDDEN', 403, { scope: 'crm' });
      if (t === 't2') x.items[2]!.status = 'done';
      return t === 't3' ? 'skipped' : 'done';
    };
    expect(await runDataJob(f.db, 'ws', 'j1', deps())).toBe('completed');
    expect(f.items.map((i) => [i.status, i.error])).toEqual([['done', null], ['failed', 'SCOPE_FORBIDDEN:scope'], ['done', null], ['skipped', null]]);
    expect(f.job).toMatchObject({ done: 3, failed: 1 });
  });

  it('kind không đăng ký → failed unknown_kind', async () => {
    const f = setup(2, { kind: 'nope' });
    expect(await runDataJob(f.db, 'ws', 'j1', deps())).toBe('failed');
    expect(f.job.error).toBe('unknown_kind');
  });
});

describe('inputHash / csvCell', () => {
  it('hash không phụ thuộc thứ tự khoá; khác giá trị → khác hash', () => {
    expect(inputHash({ a: 1, b: { y: 2, x: [1, 2] } })).toBe(inputHash({ b: { x: [1, 2], y: 2 }, a: 1 }));
    expect(inputHash({ a: 1 })).not.toBe(inputHash({ a: 2 }));
  });

  it('CSV chặn công thức (= + - @) và bọc ô có dấu phẩy / nháy / xuống dòng', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('+84901')).toBe(`"'+84901"`);
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('Lan')).toBe('Lan');
  });
});
