// TIP-034d §4.3: hợp đồng action đọc tồn ticket — chỉ đọc (ticket.view, risk read), agent dùng được khi CHỦ ĐỘNG chọn tool (không cấp
// mặc định), input rỗng nghiêm ngặt, output cùng kiểu với `/tickets/meta`.stock_summary + `result_id`; unavailable không có prior / delta.
import { describe, expect, it } from 'vitest';
import { getAction, isAgentGrantable, registry, requiresIdempotencyKey, ticketStockSummary } from '../src';

const base = {
  counts: { total: 5, open: 2, waiting: 1, breach: 1, closed: 1 },
  measured_at: '2026-11-14T10:00:00.000+07:00',
  time_zone: 'Asia/Ho_Chi_Minh',
  metric_version: 1,
  cohort: 'current_authorized_surviving',
  result_id: '0190f3a2-7b1c-7d10-9a5e-4c2b1f0e9a11',
};

describe('ticket.stock_summary', () => {
  it('đăng ký đúng một lần; chỉ đọc, ticket.view, cấp agent được (chọn tường minh), không Idempotency-Key', () => {
    expect(registry.filter((a) => a.id === 'ticket.stock_summary')).toHaveLength(1);
    expect(getAction('ticket.stock_summary')).toBe(ticketStockSummary);
    expect(ticketStockSummary).toMatchObject({ module: 'support', permission: 'ticket.view', risk: 'read', skill: true, invalidates: [] });
    expect(isAgentGrantable(ticketStockSummary)).toBe(true);
    expect(ticketStockSummary.undo).toBeUndefined();
    expect(requiresIdempotencyKey('ticket.stock_summary', 'read')).toBe(false);
  });

  it('input rỗng nghiêm ngặt — không nhận lọc / phạm vi / ngày tự chọn', () => {
    expect(ticketStockSummary.input.safeParse({}).success).toBe(true);
    expect(ticketStockSummary.input.safeParse({ date: '2026-11-01' }).success).toBe(false);
    expect(ticketStockSummary.input.safeParse({ scope: 'all' }).success).toBe(false);
  });

  it('output: available có prior + delta có dấu; unavailable chỉ có lý do (không prior / delta 0 giả)', () => {
    const ok = ticketStockSummary.output.safeParse({
      ...base,
      comparison: { status: 'available', observed_at: '2026-11-13T09:00:00.000+07:00', local_date: '2026-11-13', prior: { total: 4, open: 3, waiting: 0, breach: 2, closed: 1 }, delta: { total: 1, open: -1, waiting: 1, breach: -1, closed: 0 } },
    });
    expect(ok.success).toBe(true);
    expect(ticketStockSummary.output.safeParse({ ...base, comparison: { status: 'unavailable', reason: 'baseline_missing' } }).success).toBe(true);
    const fake = ticketStockSummary.output.safeParse({ ...base, comparison: { status: 'unavailable', reason: 'baseline_missing', prior: base.counts } });
    expect(fake.success && 'prior' in fake.data.comparison).toBe(false);
    expect(ticketStockSummary.output.safeParse({ ...base, comparison: { status: 'unavailable', reason: 'guess' } }).success).toBe(false);
    expect(ticketStockSummary.output.safeParse({ ...base, counts: { ...base.counts, total: -1 }, comparison: { status: 'unavailable', reason: 'baseline_missing' } }).success).toBe(false);
    expect(ticketStockSummary.output.safeParse({ ...base, cohort: 'workspace_total', comparison: { status: 'unavailable', reason: 'baseline_missing' } }).success).toBe(false);
    expect(ticketStockSummary.output.safeParse({ ...base, result_id: null, comparison: { status: 'unavailable', reason: 'schema_unavailable' } }).success).toBe(true);
  });

  it('mô tả cho model nói rõ tập hiện tại, không phải tăng trưởng ròng / nguyên nhân', () => {
    expect(ticketStockSummary.description).toMatch(/NOT net workspace growth/);
    expect(ticketStockSummary.description).toMatch(/never invent past values/);
  });
});
