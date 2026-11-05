// TIP-014b D (unit, DB giả) — job đồng bộ ảnh đại diện: lô ≤ 20 id mỗi lần gọi kênh, tối đa `batchesPerJob` lô / job rồi trả `more`;
// trần lượt kiểm / ngày → `capped` (không gọi kênh); thế hệ phiên đổi → `stale` (không gọi kênh); kênh không có `profiles` → unsupported;
// lùi theo số lần lỗi (1, 2, 4… phút, tối đa 6 giờ).
import { describe, expect, it } from 'vitest';
import { runAvatarSync } from '../src/channels/jobs/avatar-sync.processor';
import { avatarBackoffMs } from '../src/channels/operations/avatar-store';

type Row = { externalId: string; status: string; nextAt: Date; attempts: number; checkedAt: Date | null; fileId: string | null; sourceHash: string | null };
const NOW = new Date('2026-11-05T08:00:00Z');

function fakeDb(rows: Row[], o: { generation?: number; checkedToday?: number } = {}) {
  const db = {
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(db),
    $queryRaw: async () => [{ g: o.generation ?? 1 }],
    channelAvatar: {
      findMany: async ({ take }: { take: number }) => rows.filter((r) => r.status === 'queued' && r.nextAt <= NOW).slice(0, take),
      findFirst: async () => rows.filter((r) => r.status === 'queued').sort((a, b) => +a.nextAt - +b.nextAt)[0] ?? null,
      count: async () => (o.checkedToday ?? 0) + rows.filter((r) => r.checkedAt).length,
      updateMany: async ({ where, data }: { where: { externalId: string }; data: Partial<Row> }) => {
        const r = rows.find((x) => x.externalId === where.externalId && x.status === 'queued');
        if (r) Object.assign(r, data);
        return { count: r ? 1 : 0 };
      },
    },
    file: { updateMany: async () => ({ count: 1 }) },
  };
  return db;
}

const queued = (n: number): Row[] => Array.from({ length: n }, (_, i) => ({ externalId: String(1000 + i), status: 'queued', nextAt: NOW, attempts: 0, checkedAt: null, fileId: null, sourceHash: null }));
const log = { warn: () => undefined } as never;

function deps(db: ReturnType<typeof fakeDb>, limits: Record<string, number> = {}) {
  return { tenants: { get: async () => db } as never, files: null, log, now: () => NOW, sleep: async () => undefined, limits };
}
function adapter(calls: string[][]) {
  return { operations: { profiles: async (_: string, ids: string[]) => (calls.push(ids), ids.map((id) => ({ id, displayName: id }))) } } as never;
}

describe('runAvatarSync', () => {
  it('lô ≤ 20; tối đa batchesPerJob lô rồi trả more; không ảnh → none', async () => {
    const rows = queued(55);
    const calls: string[][] = [];
    const r = await runAvatarSync(deps(fakeDb(rows), { batchesPerJob: 2 }), 'acc', adapter(calls), { ws: 'ws' }, 1);
    expect(calls.map((c) => c.length)).toEqual([20, 20]);
    expect(r).toMatchObject({ status: 'more', checked: 40 });
    expect(rows.filter((x) => x.status === 'none')).toHaveLength(40);
  });

  it('trần lượt / ngày → capped, không gọi kênh; còn chỗ → lô thu nhỏ theo chỗ còn lại', async () => {
    const calls: string[][] = [];
    expect(await runAvatarSync(deps(fakeDb(queued(5), { checkedToday: 300 })), 'acc', adapter(calls), { ws: 'ws' }, 1)).toMatchObject({ status: 'capped' });
    expect(calls).toEqual([]);
    await runAvatarSync(deps(fakeDb(queued(5), { checkedToday: 297 }), { batchesPerJob: 1 }), 'acc', adapter(calls), { ws: 'ws' }, 1);
    expect(calls[0]).toHaveLength(3);
  });

  it('thế hệ phiên đổi → stale, không gọi kênh; kênh không có profiles → unsupported', async () => {
    const calls: string[][] = [];
    expect(await runAvatarSync(deps(fakeDb(queued(3), { generation: 2 })), 'acc', adapter(calls), { ws: 'ws' }, 1)).toMatchObject({ status: 'stale' });
    expect(calls).toEqual([]);
    expect(await runAvatarSync(deps(fakeDb(queued(3))), 'acc', { operations: {} } as never, { ws: 'ws' }, 1)).toMatchObject({ status: 'unsupported' });
  });

  it('lỗi nhà cung cấp → cả lô lùi (attempts + 1, next_at sau), job trả more kèm trễ', async () => {
    const rows = queued(2);
    const failing = { operations: { profiles: async () => Promise.reject(new Error('zalo_network')) } } as never;
    const r = await runAvatarSync(deps(fakeDb(rows)), 'acc', failing, { ws: 'ws' }, 1);
    expect(rows.every((x) => x.status === 'queued' && x.attempts === 1 && x.nextAt > NOW)).toBe(true);
    expect(r.status).toBe('more');
    expect(r.delayMs).toBe(60_000);
  });

  it('lùi: 1, 2, 4 phút … tối đa 6 giờ', () => {
    expect([1, 2, 3].map(avatarBackoffMs)).toEqual([60_000, 120_000, 240_000]);
    expect(avatarBackoffMs(20)).toBe(6 * 3_600_000);
  });
});
