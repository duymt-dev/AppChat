// TIP-034d (unit): so sánh tồn ticket — mốc thiếu / ở tương lai / nguồn bị fence / ticket cũ thiếu dòng → không so được (không bao giờ
// prior 0 giả); đủ điều kiện → prior + delta có dấu; giờ hiển thị kèm offset múi giờ workspace; ngày dọn cache = hôm nay + 7 ngày trước;
// nguồn $ref lịch sử: id mờ sai dạng → không chiếu lại; job chụp dùng cùng queue với quét SLA (không consumer thứ hai).
import { describe, expect, it } from 'vitest';
import { compareOf, toSummary, type CountRow } from '../src/support/trends/read';
import { oldestKeptDate } from '../src/support/trends/cleanup';
import { stockRefSource } from '../src/support/trends/providers';
import { STOCK_OBSERVE_EVERY_MS, STOCK_OBSERVE_JOB } from '../src/support/trends/installer';
import { isMissingStockSchema } from '../src/support/trends/control';

const now = new Date('2026-11-14T03:00:00.000Z');
const base = { id: '0190f000-0000-7000-8000-000000000901', observedAt: new Date('2026-11-13T09:00:00.000Z'), localDate: '2026-11-13' };
const row = (o: Partial<Record<string, number>> = {}): CountRow => {
  const d: Record<string, number> = { total: 5, open: 2, waiting: 1, breach: 1, closed: 1, p_total: 4, p_open: 3, p_waiting: 0, p_breach: 2, p_closed: 1, missing: 0, fenced: 0, ...o };
  return Object.fromEntries(Object.entries(d).map(([k, v]) => [k, BigInt(v)]));
};

describe('compareOf', () => {
  it('chưa có bảng → schema_unavailable; không mốc → baseline_missing (kể cả tập rỗng)', () => {
    expect(compareOf(row(), base, false, now)).toEqual({ status: 'unavailable', reason: 'schema_unavailable' });
    expect(compareOf(row({ total: 0, p_total: 0 }), null, true, now)).toEqual({ status: 'unavailable', reason: 'baseline_missing' });
  });

  it('mốc ở tương lai (đồng hồ lùi) / ticket cũ thiếu dòng → capture_unavailable; nguồn gốc bị fence → source_unavailable', () => {
    expect(compareOf(row(), { ...base, observedAt: new Date(now.getTime() + 1) }, true, now)).toEqual({ status: 'unavailable', reason: 'capture_unavailable' });
    expect(compareOf(row({ missing: 1 }), base, true, now)).toEqual({ status: 'unavailable', reason: 'capture_unavailable' });
    expect(compareOf(row({ fenced: 1, missing: 1 }), base, true, now)).toEqual({ status: 'unavailable', reason: 'source_unavailable' });
  });

  it('đủ điều kiện → prior từ cột p_*; tập rỗng có mốc → 0 / 0 / 0', () => {
    expect(compareOf(row(), base, true, now)).toEqual({ status: 'available', baseline: base, prior: { total: 4, open: 3, waiting: 0, breach: 2, closed: 1 } });
    const empty = row({ total: 0, open: 0, waiting: 0, breach: 0, closed: 0, p_total: 0, p_open: 0, p_breach: 0, p_closed: 0 });
    expect(toSummary(empty, compareOf(empty, base, true, now), 'Asia/Ho_Chi_Minh', now).comparison).toMatchObject({ status: 'available', delta: { total: 0, open: 0, waiting: 0, breach: 0, closed: 0 } });
  });
});

describe('toSummary', () => {
  it('delta có dấu; giờ đo / giờ quan sát kèm offset +07:00; unavailable không có prior / delta', () => {
    const s = toSummary(row(), compareOf(row(), base, true, now), 'Asia/Ho_Chi_Minh', now);
    expect(s).toMatchObject({ counts: { total: 5, open: 2 }, measured_at: expect.stringMatching(/\+07:00$/), time_zone: 'Asia/Ho_Chi_Minh', metric_version: 1, cohort: 'current_authorized_surviving' });
    expect(s.comparison).toMatchObject({ status: 'available', observed_at: expect.stringMatching(/^2026-11-13T16:00:00.*\+07:00$/), local_date: '2026-11-13', delta: { total: 1, open: -1, waiting: 1, breach: -1, closed: 0 } });
    const u = toSummary(row(), { status: 'unavailable', reason: 'baseline_missing' }, 'Asia/Ho_Chi_Minh', now);
    expect(u.comparison).toEqual({ status: 'unavailable', reason: 'baseline_missing' });
  });

  it('đếm vượt số nguyên an toàn → RangeError (không mất chính xác âm thầm)', () => {
    expect(() => toSummary({ ...row(), total: BigInt(Number.MAX_SAFE_INTEGER) + 1n }, { status: 'unavailable', reason: 'baseline_missing' }, 'UTC', now)).toThrow(RangeError);
  });
});

describe('cache / lịch / lịch sử', () => {
  it('giữ hôm nay + 7 ngày trước', () => {
    expect(oldestKeptDate('2026-11-14')).toBe('2026-11-07');
    expect(oldestKeptDate('2026-03-03')).toBe('2026-02-24');
  });

  it('job chụp mỗi 15 phút, tên riêng trên queue support-scheduler', () => {
    expect(STOCK_OBSERVE_JOB).toBe('support.stock-observe');
    expect(STOCK_OBSERVE_EVERY_MS).toBe(900_000);
  });

  it('nguồn $ref: không có / sai dạng result_id → không chiếu lại (không chạm DB)', async () => {
    const db = { $queryRaw: () => { throw new Error('không được gọi'); } } as never;
    const v = { userId: 'u', authz: {} as never };
    expect(await stockRefSource(db, v, { counts: {} })).toBeNull();
    expect(await stockRefSource(db, v, { result_id: 'x' })).toBeNull();
  });

  it('nhận ra lỗi thiếu bảng quan sát (DB chậm một phiên bản)', () => {
    expect(isMissingStockSchema({ meta: { code: '42P01' } })).toBe(true);
    expect(isMissingStockSchema({ message: 'relation "ticket_stock_batch" does not exist' })).toBe(true);
    expect(isMissingStockSchema({ code: '23505' })).toBe(false);
  });
});
