// TIP-015d §2.3: khoá gốc khách cho writer con — khoá khách TRƯỚC con, nhiều con thì mọi khách một câu theo id tăng dần (không theo thứ tự
// danh sách), con đổi khách trong lúc chờ → 409 (đơn) / tập id lỗi riêng (bulk); id lạ / con không gắn khách → không khoá gì.
import { describe, expect, it } from 'vitest';
import { lockContactRow, lockRootOf, lockRootsOf } from '../src/kernel/ownership/root-lock';

const U = (n: number) => `0190f000-0000-7000-8000-${String(n).padStart(12, '0')}`;
type Q = { sql: string; values: unknown[] };

/** tx giả: ghi lại câu SQL theo thứ tự; `reads` trả lần lượt cho mỗi lần đọc contact_id của con. */
function fakeTx(reads: Record<string, string | null>[][]) {
  const log: Q[] = [];
  let i = 0;
  const tx = {
    $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const sql = strings.join('?').replace(/\s+/g, ' ');
      log.push({ sql, values });
      if (/FOR UPDATE/.test(sql)) return [];
      const r = reads[Math.min(i++, reads.length - 1)]!;
      return r.map((x) => ({ id: x.id, contact_id: x.contact_id }));
    },
  };
  return { tx: tx as never, log };
}

describe('root-lock', () => {
  it('id lạ / null → không truy vấn', async () => {
    const { tx, log } = fakeTx([[]]);
    await lockContactRow(tx, null);
    await lockContactRow(tx, 'x');
    await lockRootOf(tx, 'conversation', 'không-phải-uuid');
    expect(log).toEqual([]);
  });

  it('đơn: đọc khách của con → khoá khách → đọc lại; đổi khách giữa chừng → 409', async () => {
    const ok = fakeTx([[{ id: U(1), contact_id: U(9) }], [{ id: U(1), contact_id: U(9) }]]);
    await lockRootOf(ok.tx, 'quote', U(1));
    expect(ok.log.map((q) => (/FOR UPDATE/.test(q.sql) ? 'lock' : 'read'))).toEqual(['read', 'lock', 'read']);
    expect(ok.log[1]!.values).toEqual([U(9)]);
    const moved = fakeTx([[{ id: U(1), contact_id: U(9) }], [{ id: U(1), contact_id: U(8) }]]);
    await expect(lockRootOf(moved.tx, 'quote', U(1))).rejects.toMatchObject({ code: 'CONFLICT', httpStatus: 409 });
  });

  it('con không gắn khách → không khoá', async () => {
    const { tx, log } = fakeTx([[{ id: U(1), contact_id: null }]]);
    await lockRootOf(tx, 'conversation', U(1));
    expect(log.filter((q) => /FOR UPDATE/.test(q.sql))).toEqual([]);
  });

  it('bulk: mọi khách một câu, id tăng dần, trùng bỏ; con đổi khách → trả về id đó', async () => {
    const before = [{ id: U(1), contact_id: U(30) }, { id: U(2), contact_id: U(10) }, { id: U(3), contact_id: U(30) }, { id: U(4), contact_id: U(20) }];
    const after = before.map((x) => (x.id === U(4) ? { ...x, contact_id: U(21) } : x));
    const { tx, log } = fakeTx([before, after]);
    const moved = await lockRootsOf(tx, 'conversation', [U(1), U(2), U(3), U(4), 'rác']);
    const locks = log.filter((q) => /FOR UPDATE/.test(q.sql));
    expect(locks).toHaveLength(1);
    expect(locks[0]!.sql).toContain('ORDER BY id FOR UPDATE');
    expect(locks[0]!.values).toEqual([[U(10), U(20), U(30)]]);
    expect([...moved]).toEqual([U(4)]);
  });
});
