// TIP-023e §3.1-3.4: cache câu hỏi riêng theo gốc — khoá HMAC theo workspace (không chứa câu hỏi thô), khác gốc / người / tập được phép
// / corpus → khoá khác; ≤ 128 mục / gốc bỏ cũ nhất; Redis lỗi → miss im lặng; service: hit không embed lại, cache_hit=true, vẫn lọc quyền.
import { describe, expect, it, vi } from 'vitest';
import { authzForRole } from '@appchat/shared';
import { CACHE_MAX_PER_ROOT, DiscoveryCache, admissibleFingerprint, discoveryCacheOf, type CacheRedis, type CacheScope } from '../src/ai/assistant/discovery/cache';
import { discoverActions, type DiscoveryDeps } from '../src/ai/assistant/discovery/service';

function memRedis() {
  const kv = new Map<string, string>();
  const z = new Map<string, Map<string, number>>();
  const zs = (k: string) => [...(z.get(k) ?? new Map()).entries()].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0])).map((e) => e[0]);
  const r = {
    kv,
    get: async (k: string) => kv.get(k) ?? null,
    set: async (k: string, v: string) => (kv.set(k, v), 'OK'),
    zadd: async (k: string, s: number, m: string) => ((z.get(k) ?? z.set(k, new Map()).get(k)!).set(m, s), 1),
    zcard: async (k: string) => z.get(k)?.size ?? 0,
    zrange: async (k: string, a: number, b: number) => zs(k).slice(a, b + 1),
    zremrangebyrank: async (k: string, a: number, b: number) => {
      const drop = zs(k).slice(a, b + 1);
      for (const m of drop) z.get(k)!.delete(m);
      return drop.length;
    },
    del: async (...ks: string[]) => ks.filter((k) => kv.delete(k)).length,
    pexpire: async () => 1,
  };
  return r;
}

const MASTER = Buffer.alloc(32, 7);
const base: CacheScope = { ws: 'ws1', rootRunId: 'root1', userId: 'u1', corpusHash: 'c1', spaceKey: 's1', allowedIds: ['contact.create', 'contact.search'], query: 'thêm khách' };

describe('DiscoveryCache', () => {
  it('khoá không chứa câu hỏi; mỗi chiều phạm vi đổi → khoá khác; thứ tự tập được phép không đổi khoá', () => {
    const c = new DiscoveryCache(memRedis() as unknown as CacheRedis, MASTER);
    const k = c.key(base);
    expect(k).not.toContain('khách');
    for (const p of [{ rootRunId: 'root2' }, { userId: 'u2' }, { ws: 'ws2' }, { corpusHash: 'c2' }, { spaceKey: 's2' }, { module: 'crm' }, { allowedIds: ['contact.create'] }, { query: 'khác' }]) expect(c.key({ ...base, ...p })).not.toBe(k);
    expect(c.key({ ...base, allowedIds: ['contact.search', 'contact.create'] })).toBe(k);
    expect(admissibleFingerprint(['b', 'a'])).toBe(admissibleFingerprint(['a', 'b']));
  });

  it('set → get trả id; quá 128 mục / gốc → mục cũ nhất bị bỏ', async () => {
    let t = 0;
    const r = memRedis();
    const c = new DiscoveryCache(r as unknown as CacheRedis, MASTER, () => ++t);
    await c.set(base, ['contact.create']);
    expect(await c.get(base)).toEqual(['contact.create']);
    for (let i = 0; i < CACHE_MAX_PER_ROOT; i++) await c.set({ ...base, query: `q${i}` }, ['x']);
    expect(await c.get(base)).toBeNull();
    expect(await c.get({ ...base, query: `q${CACHE_MAX_PER_ROOT - 1}` })).toEqual(['x']);
  });

  it('Redis lỗi → get null, set không ném', async () => {
    const bad = { get: async () => { throw new Error('down'); }, set: async () => { throw new Error('down'); } } as unknown as CacheRedis;
    const c = new DiscoveryCache(bad, MASTER);
    expect(await c.get(base)).toBeNull();
    await expect(c.set(base, ['a'])).resolves.toBeUndefined();
  });

  it('discoveryCacheOf: thiếu Redis sorted-set hoặc khoá → null', () => {
    expect(discoveryCacheOf(null, 'k')).toBeNull();
    expect(discoveryCacheOf({ get: () => null }, 'k')).toBeNull();
    expect(discoveryCacheOf(memRedis(), null)).toBeNull();
    expect(discoveryCacheOf(memRedis(), 'k')).toBeInstanceOf(DiscoveryCache);
  });
});

describe('discoverActions + cache', () => {
  it('lần 2 cùng câu hỏi → hit: không embed, không truy vấn vector, cache_hit=true; người khác → miss', async () => {
    const store = new DiscoveryCache(memRedis() as unknown as CacheRedis, MASTER);
    const db = { actionDiscoveryGeneration: { findUnique: vi.fn().mockResolvedValue({ id: 'g', phase: 'ready' }) }, $queryRaw: vi.fn().mockResolvedValue([{ action_id: 'contact.create', score: 0.9 }]) } as unknown as DiscoveryDeps['db'];
    const queryVector = vi.fn().mockResolvedValue([1, 0]);
    const space = { provider: 'p', model: 'm', dimension: 1536, configRevision: '' };
    const input = { authz: authzForRole('owner', 'u1'), mode: 'cowork' as const, query: 'thêm khách', limit: 8, implemented: () => true };
    const d = (userId: string): DiscoveryDeps => ({ db, space, queryVector, cache: { store, ws: 'ws1', rootRunId: 'root1', userId } });
    const a = await discoverActions(d('u1'), input);
    const b = await discoverActions(d('u1'), input);
    expect(a.discovery.cache_hit).toBe(false);
    expect(b.discovery).toMatchObject({ strategy: 'hybrid', cache_hit: true });
    expect(queryVector).toHaveBeenCalledTimes(1);
    expect(db.$queryRaw).toHaveBeenCalledTimes(1);
    expect(b.actions.map((x) => x.id)).toContain('contact.create');
    await discoverActions(d('u2'), input);
    expect(queryVector).toHaveBeenCalledTimes(2);
  });

  it('hit vẫn lọc quyền hiện hành: tập được phép đổi (quyền hẹp) → khoá khác, không dùng ứng viên cũ', async () => {
    const store = new DiscoveryCache(memRedis() as unknown as CacheRedis, MASTER);
    const db = { actionDiscoveryGeneration: { findUnique: vi.fn().mockResolvedValue({ id: 'g', phase: 'ready' }) }, $queryRaw: vi.fn().mockResolvedValue([{ action_id: 'contact.delete', score: 0.9 }]) } as unknown as DiscoveryDeps['db'];
    const queryVector = vi.fn().mockResolvedValue([1, 0]);
    const space = { provider: 'p', model: 'm', dimension: 1536, configRevision: '' };
    const dep: DiscoveryDeps = { db, space, queryVector, cache: { store, ws: 'ws1', rootRunId: 'root1', userId: 'u1' } };
    await discoverActions(dep, { authz: authzForRole('owner', 'u1'), mode: 'cowork', query: 'xoá khách', limit: 8, implemented: () => true });
    const narrow = await discoverActions(dep, { authz: authzForRole('cs', 'u1'), mode: 'chat', query: 'xoá khách', limit: 8, implemented: () => true });
    expect(narrow.discovery.cache_hit).toBe(false);
    expect(narrow.actions.map((x) => x.id)).not.toContain('contact.delete');
  });
});
