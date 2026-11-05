// TIP-045b annex C — dọn trường tuỳ biến đã xoá (custom-fields §2): chỉ định nghĩa xoá mềm quá 30 ngày; bỏ key theo lô tới khi sạch rồi
// mới xoá hẳn định nghĩa (key mới dùng lại không thừa hưởng giá trị cũ); định nghĩa được khôi phục giữa chừng → không đụng; trường hệ
// thống không bao giờ dọn. DB giả lập đúng các truy vấn (SQL thật chạy ở hardening-fields integration).
import { describe, expect, it } from 'vitest';
import { CUSTOM_FIELD_RETENTION_MS, PRUNE_BATCH, pruneDeletedFields } from '../src/crm/jobs/custom-field-prune';

const NOW = new Date('2026-11-05T00:00:00Z');
const old = new Date(NOW.getTime() - CUSTOM_FIELD_RETENTION_MS - 1000);
const fresh = new Date(NOW.getTime() - 86_400_000);

type Def = { id: string; entity: string; key: string; deletedAt: Date | null; sys: boolean };

function fakeDb(defs: Def[], carrying: Record<string, number>, opts: { restoreAfterFirst?: string } = {}) {
  const state = { defs: [...defs], carrying: { ...carrying }, batches: 0 };
  const keyOf = (q: { strings?: readonly string[]; values?: unknown[] }) => String(q.values?.find((v) => typeof v === 'string' && v.startsWith('$.')) ?? '').slice(3, -1);
  const tx = {
    $queryRaw: async (q: { strings: readonly string[]; values: unknown[] }) => {
      const key = keyOf(q);
      const n = Math.min(PRUNE_BATCH, state.carrying[key] ?? 0);
      return Array.from({ length: n }, (_, i) => ({ id: `${key}-${i}` }));
    },
    $executeRaw: async (q: { values: unknown[] }) => {
      const key = q.values.find((v) => typeof v === 'string' && !String(v).startsWith('$.')) as string;
      const ids = q.values.find(Array.isArray) as string[];
      state.carrying[key] = (state.carrying[key] ?? 0) - ids.length;
      state.batches++;
      if (opts.restoreAfterFirst === key) state.defs.find((d) => d.key === key)!.deletedAt = null;
      return ids.length;
    },
    customFieldDef: {
      findUnique: async ({ where }: { where: { entity_key: { key: string } } }) => state.defs.find((d) => d.key === where.entity_key.key) ?? null,
    },
  };
  const db = {
    $transaction: async (fn: (t: typeof tx) => Promise<number>) => fn(tx),
    $queryRaw: async (q: { values: unknown[] }) => {
      const key = keyOf(q);
      return [{ n: BigInt(state.carrying[key] ? 1 : 0) }];
    },
    customFieldDef: {
      findMany: async ({ where }: { where: { deletedAt: { lt: Date }; sys: boolean } }) => state.defs.filter((d) => !d.sys && d.deletedAt && d.deletedAt < where.deletedAt.lt),
      deleteMany: async ({ where }: { where: { id: string; deletedAt: { lt: Date } } }) => {
        const i = state.defs.findIndex((d) => d.id === where.id && d.deletedAt && d.deletedAt < where.deletedAt.lt);
        if (i < 0) return { count: 0 };
        state.defs.splice(i, 1);
        return { count: 1 };
      },
    },
  };
  return { db: db as never, state };
}

describe('pruneDeletedFields', () => {
  it('quá 30 ngày: bỏ key qua nhiều lô rồi xoá hẳn định nghĩa; còn hạn / hệ thống giữ nguyên', async () => {
    const { db, state } = fakeDb(
      [
        { id: 'd1', entity: 'contact', key: 'size', deletedAt: old, sys: false },
        { id: 'd2', entity: 'contact', key: 'vip', deletedAt: fresh, sys: false },
        { id: 'd3', entity: 'contact', key: 'full_name', deletedAt: old, sys: true },
      ],
      { size: PRUNE_BATCH + 7, vip: 3, full_name: 2 },
    );
    const r = await pruneDeletedFields(db, NOW);
    expect(r).toEqual({ values: PRUNE_BATCH + 7, defs: 1 });
    expect(state.carrying).toMatchObject({ size: 0, vip: 3, full_name: 2 });
    expect(state.defs.map((d) => d.id).sort()).toEqual(['d2', 'd3']);
    expect(state.batches).toBe(2);
  });

  it('chạy lại idempotent: không còn gì để dọn', async () => {
    const { db } = fakeDb([{ id: 'd1', entity: 'order', key: 'x', deletedAt: old, sys: false }], { x: 0 });
    expect(await pruneDeletedFields(db, NOW)).toEqual({ values: 0, defs: 1 });
  });

  it('định nghĩa được khôi phục giữa chừng → dừng bỏ key, không xoá định nghĩa', async () => {
    const { db, state } = fakeDb([{ id: 'd1', entity: 'ticket', key: 'zone', deletedAt: old, sys: false }], { zone: PRUNE_BATCH * 2 }, { restoreAfterFirst: 'zone' });
    const r = await pruneDeletedFields(db, NOW);
    expect(r.defs).toBe(0);
    expect(state.carrying.zone).toBe(PRUNE_BATCH);
    expect(state.defs).toHaveLength(1);
  });
});
