// TIP-037 (unit, Redis giả) — trần tin chủ động / ngày / tài khoản (D35): sổ theo ref (chạy lại không đếm đôi), hết trần → mốc đầu ngày kế
// tiếp theo UTC+7 (không theo múi giờ máy), trả suất khi bị loại trước kênh, mọi nguồn chủ động dùng chung sổ, kênh không trần không chặn.
import { describe, expect, it } from 'vitest';
import type { Redis } from 'ioredis';
import { capDay, capUsed, nextCapWindow, releaseCapSlot, takeCapSlot } from '../src/channels/services/proactive-cap';

function fakeRedis() {
  const sets = new Map<string, Set<string>>();
  const get = (k: string) => sets.get(k) ?? sets.set(k, new Set()).get(k)!;
  const r = {
    sadd: async (k: string, v: string) => (get(k).has(v) ? 0 : (get(k).add(v), 1)),
    srem: async (k: string, v: string) => (get(k).delete(v) ? 1 : 0),
    scard: async (k: string) => get(k).size,
    pexpire: async () => 1,
  };
  return r as unknown as Redis;
}

const ACC = 'acc1';

describe('trần tin chủ động', () => {
  it('ngày theo UTC+7: 16:59Z và 17:00Z là hai ngày khác nhau; mốc dời = 00:00 giờ Việt Nam hôm sau', () => {
    expect(capDay(new Date('2026-06-24T16:59:00Z'))).toBe('2026-06-24');
    expect(capDay(new Date('2026-06-24T17:00:00Z'))).toBe('2026-06-25');
    expect(nextCapWindow(new Date('2026-06-24T02:00:00Z')).toISOString()).toBe('2026-06-24T17:00:00.000Z');
  });

  it('hết trần → từ chối kèm mốc hôm sau; chạy lại cùng ref không đếm thêm; trả suất → tin khác dùng được', async () => {
    const redis = fakeRedis();
    const now = new Date('2026-06-24T02:00:00Z');
    expect(await takeCapSlot(redis, ACC, 'cr_1', 2, now)).toEqual({ ok: true });
    expect(await takeCapSlot(redis, ACC, 'cr_2', 2, now)).toEqual({ ok: true });
    expect(await takeCapSlot(redis, ACC, 'cr_1', 2, now)).toEqual({ ok: true });
    const over = await takeCapSlot(redis, ACC, 'cr_3', 2, now);
    expect(over).toEqual({ ok: false, until: new Date('2026-06-24T17:00:00.000Z') });
    expect(await capUsed(redis, ACC, now)).toBe(2);
    await releaseCapSlot(redis, ACC, 'cr_2', now);
    expect(await takeCapSlot(redis, ACC, 'cr_3', 2, now)).toEqual({ ok: true });
  });

  it('chiến dịch + Inbox mở chuỗi + follow-up dùng chung một sổ của tài khoản; tài khoản khác sổ riêng; ngày mới đếm lại', async () => {
    const redis = fakeRedis();
    const now = new Date('2026-06-24T02:00:00Z');
    expect((await takeCapSlot(redis, ACC, 'cr_a', 2, now)).ok).toBe(true);
    expect((await takeCapSlot(redis, ACC, 'msg_b', 2, now)).ok).toBe(true);
    expect((await takeCapSlot(redis, ACC, 'fu_c', 2, now)).ok).toBe(false);
    expect((await takeCapSlot(redis, 'acc2', 'fu_c', 2, now)).ok).toBe(true);
    expect((await takeCapSlot(redis, ACC, 'fu_c', 2, new Date('2026-06-24T17:00:00Z'))).ok).toBe(true);
  });

  it('kênh không có trần chủ động (cap undefined) → không chặn, không ghi sổ', async () => {
    const redis = fakeRedis();
    const now = new Date('2026-06-24T02:00:00Z');
    for (let i = 0; i < 5; i++) expect(await takeCapSlot(redis, ACC, `e_${i}`, undefined, now)).toEqual({ ok: true });
    expect(await capUsed(redis, ACC, now)).toBe(0);
  });
});
