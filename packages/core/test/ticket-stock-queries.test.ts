// TIP-034d §5.2 (unit): số câu lệnh cố định, không phụ thuộc số ticket — đọc = 3 câu (bảng có chưa / mốc / MỘT câu đếm), chụp = 8 câu
// (timeout ×2, khoá control, kiểm ngày, header, INSERT…SELECT, hoàn tất, control). Câu đếm: một CTE tập hiện tại + nối mốc, không LIMIT
// (không lấy mẫu rồi gọi là tổng), không `SELECT *` trên bảng ticket, thời gian nghiệp vụ là tham số Clock (không `now()` của SQL).
import { describe, expect, it } from 'vitest';
import type { AuthzContext } from '@appchat/shared';
import { readStockSummary, stockReadSql } from '../src/support/trends/read';
import { captureStock } from '../src/support/trends/snapshot';
import { materializeStockResult } from '../src/support/trends/projection';
import { breachSql } from '../src/support/trends/metrics-sql';

type Sql = { sql: string; values: unknown[] };
const now = new Date('2026-11-14T03:00:00.000Z');
const owner = { userId: 'u', isOwner: true, permissions: new Set(), scope: {}, teamIds: [] } as unknown as AuthzContext;
const zero = { total: 0n, open: 0n, waiting: 0n, breach: 0n, closed: 0n, p_total: 0n, p_open: 0n, p_waiting: 0n, p_breach: 0n, p_closed: 0n, missing: 0n, fenced: 0n };

/** tx giả: ghi lại mọi câu lệnh, trả lời theo nội dung. */
function fakeTx(answer: (sql: string) => unknown[]) {
  const seen: Sql[] = [];
  const run = (q: TemplateStringsArray | Sql, ...vals: unknown[]) => {
    const s: Sql = 'sql' in q ? q : { sql: q.join('?'), values: vals };
    seen.push(s);
    return Promise.resolve(answer(s.sql));
  };
  return { seen, tx: { $queryRaw: run, $executeRaw: (q: TemplateStringsArray | Sql, ...v: unknown[]) => run(q, ...v).then(() => 1) } };
}

describe('đọc tồn ticket', () => {
  it('3 câu lệnh; câu đếm một CTE, không LIMIT / SELECT * / now() SQL; mốc Clock là tham số', async () => {
    const { seen, tx } = fakeTx((s) => (s.includes('to_regclass') ? [{ ok: true }] : s.includes('FROM ticket_stock_batch') ? [{ id: 'b', observed_at: new Date('2026-11-13T09:00:00Z') }] : [zero]));
    const r = await readStockSummary(tx as never, owner, 'Asia/Ho_Chi_Minh', now);
    expect(seen).toHaveLength(3);
    expect(r.comparison).toMatchObject({ status: 'available', local_date: '2026-11-13' });
    const q = seen[2]!.sql;
    expect(q).toMatch(/^WITH cur AS MATERIALIZED/);
    expect(q).not.toMatch(/\bLIMIT\b/i);
    expect(q).not.toMatch(/SELECT \* FROM ticket|\bt\.\*/);
    expect(q).not.toMatch(/now\(\)/i);
    expect(seen[2]!.values).toContain(now);
  });

  it('mốc ngày đúng "hôm qua" theo múi giờ workspace (00:30 giờ VN 15/11 → 14/11), không lùi thêm', async () => {
    const { seen, tx } = fakeTx((s) => (s.includes('to_regclass') ? [{ ok: true }] : s.includes('FROM ticket_stock_batch') ? [] : [zero]));
    const r = await readStockSummary(tx as never, owner, 'Asia/Ho_Chi_Minh', new Date('2026-11-14T17:30:00Z'));
    expect(seen[1]!.values).toContain('2026-11-14');
    expect(r.comparison).toEqual({ status: 'unavailable', reason: 'baseline_missing' });
  });

  it('DB chưa có bảng → 2 câu (không chạm bảng quan sát); số hiện tại vẫn có, schema_unavailable; kết quả action result_id null', async () => {
    const { seen, tx } = fakeTx((s) => (s.includes('to_regclass') ? [{ ok: false }] : [{ ...zero, total: 4n, open: 4n }]));
    const r = await readStockSummary(tx as never, owner, 'Asia/Ho_Chi_Minh', now);
    expect(seen).toHaveLength(2);
    expect(seen.some((s) => s.sql.includes('ticket_stock_observation'))).toBe(false);
    expect(r).toMatchObject({ counts: { total: 4, open: 4 }, comparison: { status: 'unavailable', reason: 'schema_unavailable' } });
    expect(await materializeStockResult(tx as never, owner, 'Asia/Ho_Chi_Minh', now)).toMatchObject({ result_id: null, counts: { total: 4 } });
  });

  it('câu đọc dùng nguyên vị từ quá hạn của meta (mốc tham số, đúng bằng hạn không quá hạn)', () => {
    const b = breachSql(now) as unknown as Sql;
    expect(b.sql).toMatch(/coalesce\(t\.paused_since, \?\) > t\.ttr_due_at/);
    expect(b.sql).toMatch(/t\.sla_result = 'breached'/);
    expect(b.values).toEqual([now]);
    expect((stockReadSql(owner, null, now) as unknown as Sql).sql).toMatch(/false AS matched/);
  });
});

describe('chụp tồn ticket', () => {
  it('8 câu cố định; Clock gọi SAU khoá control; INSERT…SELECT trong Postgres (không nạp ticket vào Node)', async () => {
    const order: string[] = [];
    const { seen, tx } = fakeTx((s) => {
      order.push(s.includes('FOR UPDATE') ? 'lock' : 'q');
      return s.includes('FOR UPDATE') ? [{ id: 1 }] : [];
    });
    const db = { $transaction: <T>(fn: (t: never) => Promise<T>) => fn(tx as never) };
    const r = await captureStock(db, 'Asia/Ho_Chi_Minh', () => {
      order.push('clock');
      return now;
    });
    expect(r).toMatchObject({ status: 'captured', localDate: '2026-11-14' });
    expect(seen).toHaveLength(8);
    expect(order.indexOf('lock')).toBeLessThan(order.indexOf('clock'));
    expect(seen.find((s) => s.sql.includes('INSERT INTO ticket_stock_observation'))!.sql).toMatch(/SELECT[\s\S]+FROM ticket t WHERE/);
    expect(seen.some((s) => /FOR (UPDATE|SHARE)/.test(s.sql) && !s.sql.includes('ticket_stock_control'))).toBe(false);
  });

  it('đã có lần chụp của ngày → 4 câu, không ghi gì; thiếu dòng control (DB chưa migrate) → skipped', async () => {
    const hit = fakeTx((s) => (s.includes('FOR UPDATE') ? [{ id: 1 }] : s.includes('FROM ticket_stock_batch') ? [{ id: 'b' }] : []));
    const r = await captureStock({ $transaction: (fn) => fn(hit.tx as never) }, 'Asia/Ho_Chi_Minh', () => now);
    expect(r).toMatchObject({ status: 'exists', batchId: 'b' });
    expect(hit.seen).toHaveLength(4);
    const none = fakeTx(() => []);
    expect(await captureStock({ $transaction: (fn) => fn(none.tx as never) }, 'Asia/Ho_Chi_Minh', () => now)).toMatchObject({ status: 'skipped' });
  });
});
