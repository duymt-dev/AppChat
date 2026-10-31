import { describe, expect, it } from 'vitest';
import { AppError } from '../errors';
import { assertTransition, nextState } from '../state/flow';
import { ORDER_FLOW, ORDER_STATUSES, payStatusOf, pointsFor, type OrderStatusKey } from './order-state';

// Bảng đầy đủ (state-machine §3): mọi cặp (trạng thái × action) — có trong bảng ra đúng đích, còn lại INVALID_TRANSITION.
const ACTIONS = ['order.update', 'order.set_deposit', 'order.update_shipping', 'order.confirm', 'order.complete', 'order.cancel'];
const WANT: Partial<Record<OrderStatusKey, Record<string, OrderStatusKey>>> = {
  new: { 'order.update': 'new', 'order.set_deposit': 'new', 'order.update_shipping': 'new', 'order.confirm': 'processing', 'order.cancel': 'cancelled' },
  processing: { 'order.update': 'processing', 'order.set_deposit': 'processing', 'order.update_shipping': 'processing', 'order.complete': 'completed', 'order.cancel': 'cancelled' },
};

describe('ORDER_FLOW', () => {
  it('mọi cặp trạng thái × action', () => {
    for (const s of ORDER_STATUSES)
      for (const a of ACTIONS) {
        const to = WANT[s]?.[a] ?? null;
        expect(nextState(ORDER_FLOW, s, a), `${s} × ${a}`).toBe(to);
        if (!to) expect(() => assertTransition(ORDER_FLOW, s, a)).toThrow(AppError);
      }
  });
});

describe('payStatusOf', () => {
  const o = (paid: number, extra: Partial<Parameters<typeof payStatusOf>[0]> = {}) =>
    payStatusOf({ status: 'processing', total: 1000, paid, refunded: 0, depositRequired: false, depositAmount: null, ...extra });
  it('chưa thu: Chờ cọc chỉ khi bật cọc', () => {
    expect(o(0)).toBe('unpaid');
    expect(o(0, { depositRequired: true, depositAmount: 300 })).toBe('awaiting_deposit');
  });
  it('đã cọc / một phần / đủ', () => {
    expect(o(300, { depositRequired: true, depositAmount: 300 })).toBe('deposited');
    expect(o(200, { depositRequired: true, depositAmount: 300 })).toBe('partial');
    expect(o(200)).toBe('partial');
    expect(o(1000)).toBe('paid');
  });
  it('hoàn tiền một phần / toàn bộ', () => {
    expect(o(1000, { refunded: 400 })).toBe('partially_refunded');
    expect(o(1000, { refunded: 1000 })).toBe('refunded');
  });
});

describe('pointsFor', () => {
  it('10.000đ = 1 điểm, làm tròn xuống, nhân hệ số hạng', () => {
    expect(pointsFor(12_809_999n, null)).toBe(1280);
    expect(pointsFor('9999', 'member')).toBe(0);
    expect(pointsFor(100_000n, 'gold')).toBe(15);
    expect(pointsFor(100_000n, 'diamond')).toBe(20);
  });
});
