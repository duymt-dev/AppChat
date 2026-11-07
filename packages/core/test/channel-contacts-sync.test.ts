// TIP-014b D3 (unit, DB giả) — đồng bộ danh bạ: trang ≤ pageSize, trang thiếu → complete; chạm trần trang → partial; thế hệ phiên đổi →
// partial, không gọi kênh nữa; kênh không có `friends` → failed. Đọc: SĐT thuộc khách ngoài scope người xem → `conflict` (không id),
// trong scope → `known`; thiếu SĐT → `no_phone`; quá hạn 24 giờ / khác tài khoản → null (404).
import { describe, expect, it } from 'vitest';
import { runContactSync } from '../src/channels/jobs/contact-sync.processor';
import { readContactSync } from '../src/channels/operations/contact-sync';

const NOW = new Date('2026-11-05T08:00:00Z');
const log = { warn: () => undefined } as never;

function fakeDb(o: { generation?: number } = {}) {
  const run = { id: 's1', channelAccountId: 'acc', status: 'queued', pages: 0, received: 0 } as Record<string, unknown>;
  const snap: { externalId: string }[] = [];
  const db = {
    run,
    snap,
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(db),
    $queryRaw: async () => [{ g: o.generation ?? 1 }],
    channelContactSync: {
      findUnique: async () => run,
      updateMany: async ({ where, data }: { where: { status: string }; data: object }) => (run.status === where.status ? (Object.assign(run, data), { count: 1 }) : { count: 0 }),
      update: async ({ data }: { data: { pages: { increment: number }; received: { increment: number } } }) => {
        run.pages = (run.pages as number) + data.pages.increment;
        run.received = (run.received as number) + data.received.increment;
      },
    },
    channelContactSnapshot: { createMany: async ({ data }: { data: { externalId: string }[] }) => (snap.push(...data), { count: data.length }) },
  };
  return db;
}
const deps = (db: ReturnType<typeof fakeDb>, limits = {}) => ({ tenants: { get: async () => db } as never, log, now: () => NOW, limits });
const book = (n: number) => Array.from({ length: n }, (_, i) => ({ id: String(100 + i), displayName: `B${i}` }));
function adapter(all: { id: string; displayName: string }[], pages: number[]) {
  return { operations: { friends: async (_: string, page: number, count: number) => (pages.push(page), all.slice((page - 1) * count, page * count)) } } as never;
}

describe('runContactSync', () => {
  it('trang thiếu → complete; ghi ảnh chụp theo trang', async () => {
    const db = fakeDb();
    const pages: number[] = [];
    expect(await runContactSync(deps(db, { pageSize: 10 }), 'acc', adapter(book(25), pages), { ws: 'ws', sync_id: 's1' }, 1)).toBe('complete');
    expect(pages).toEqual([1, 2, 3]);
    expect(db.run).toMatchObject({ status: 'complete', pages: 3, received: 25 });
  });

  it('chạm trần trang → partial (không xin thêm)', async () => {
    const db = fakeDb();
    const pages: number[] = [];
    expect(await runContactSync(deps(db, { pageSize: 10, maxPages: 2 }), 'acc', adapter(book(50), pages), { ws: 'ws', sync_id: 's1' }, 1)).toBe('partial');
    expect(pages).toEqual([1, 2]);
    expect(db.run.status).toBe('partial');
  });

  it('thế hệ phiên đổi → partial, không gọi kênh; không có friends → failed', async () => {
    const pages: number[] = [];
    const stale = fakeDb({ generation: 2 });
    expect(await runContactSync(deps(stale), 'acc', adapter(book(3), pages), { ws: 'ws', sync_id: 's1' }, 1)).toBe('partial');
    expect(pages).toEqual([]);
    const none = fakeDb();
    expect(await runContactSync(deps(none), 'acc', { operations: {} } as never, { ws: 'ws', sync_id: 's1' }, 1)).toBe('failed');
    expect(none.run).toMatchObject({ status: 'failed', error: 'contacts_unsupported' });
  });
});

describe('readContactSync', () => {
  const tx = (expires: Date) =>
    ({
      channelContactSync: { findUnique: async () => ({ id: 's1', channelAccountId: 'acc', status: 'complete', pages: 1, received: 3, error: null, createdAt: NOW, finishedAt: NOW, expiresAt: expires }) },
      channelContactSnapshot: {
        findMany: async () => [
          { externalId: 'a', displayName: 'Mine', phone: '0909000111', seq: 0 },
          { externalId: 'b', displayName: 'Other', phone: '0909 000 222', seq: 1 },
          { externalId: 'c', displayName: 'No phone', phone: null, seq: 2 },
        ],
      },
      contactIdentity: { findMany: async () => [] },
      contact: { findMany: async () => [{ id: 'k1', phoneNorm: '0909000111' }, { id: 'k2', phoneNorm: '0909000222' }] },
    }) as never;

  it('trong scope → known; ngoài scope → conflict không id; thiếu SĐT → no_phone', async () => {
    const r = (await readContactSync(tx(new Date(NOW.getTime() + 1000)), 'acc', 's1', NOW, -1, { userId: 'u', visible: async () => new Set(['k1']) }))!;
    expect(r.rows).toEqual([
      { external_id: 'a', name: 'Mine', phone: '0909000111', state: 'known', contact_id: 'k1' },
      { external_id: 'b', name: 'Other', phone: '0909000222', state: 'conflict', contact_id: null },
      { external_id: 'c', name: 'No phone', phone: null, state: 'no_phone', contact_id: null },
    ]);
  });

  it('quá hạn / khác tài khoản → null', async () => {
    expect(await readContactSync(tx(NOW), 'acc', 's1', NOW, -1, { userId: 'u', visible: async () => new Set() })).toBeNull();
    expect(await readContactSync(tx(new Date(NOW.getTime() + 1000)), 'other', 's1', NOW, -1, { userId: 'u', visible: async () => new Set() })).toBeNull();
  });
});
