import { describe, expect, it } from 'vitest';
import { AppError } from '../errors';
import { formatCode } from '../codes';
import { allowedActions, assertTransition, assertVersion, defineFlow, nextState } from './flow';

type S = 'new' | 'processing' | 'completed' | 'cancelled';
const order = defineFlow<S>({
  new: { 'order.confirm': 'processing', 'order.cancel': 'cancelled' },
  processing: { 'order.complete': 'completed', 'order.cancel': 'cancelled' },
  completed: {},
  cancelled: {},
  terminal: ['completed', 'cancelled'],
});

describe('flow', () => {
  it('cặp có trong flow → đúng đích; không có → INVALID_TRANSITION kèm trạng thái hiện tại', () => {
    expect(assertTransition(order, 'new', 'order.confirm')).toBe('processing');
    expect(nextState(order, 'completed', 'order.cancel')).toBeNull();
    try {
      assertTransition(order, 'completed', 'order.cancel');
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect((e as AppError).code).toBe('INVALID_TRANSITION');
      expect((e as AppError).httpStatus).toBe(409);
      expect((e as AppError).fields).toEqual({ status: 'completed' });
    }
  });

  it('allowedActions cho FE bật nút', () => {
    expect(allowedActions(order, 'processing').sort()).toEqual(['order.cancel', 'order.complete']);
    expect(allowedActions(order, 'completed')).toEqual([]);
  });

  it('trạng thái cuối có chuyển đổi đi ra → lỗi lúc define', () => {
    expect(() => defineFlow<'a' | 'b'>({ a: { x: 'b' }, b: { y: 'a' }, terminal: ['b'] })).toThrow(/cuối/);
  });

  it('assertVersion: lệch → STALE_VERSION; không gửi → bỏ qua', () => {
    expect(() => assertVersion(3, 3)).not.toThrow();
    expect(() => assertVersion(3, undefined)).not.toThrow();
    expect(() => assertVersion(3, 2)).toThrow(expect.objectContaining({ code: 'STALE_VERSION', httpStatus: 409 }));
  });
});

describe('formatCode', () => {
  it.each([
    ['contact', 1001, 'KH-1001'],
    ['order', 123, 'DH-000123'],
    ['invoice', 2041, 'TT-002041'],
    ['ticket', 2041, 'TKT-2041'],
    ['contract', 1180, 'HĐ-1180'],
    ['campaign', 12, 'CD-0012'],
    ['quote', 123456, 'BG-123456'],
  ] as const)('%s %i → %s', (kind, n, out) => {
    expect(formatCode(kind, n)).toBe(out);
  });

  it('bigint + số không hợp lệ', () => {
    expect(formatCode('order', 1234567n)).toBe('DH-1234567');
    expect(() => formatCode('order', 0)).toThrow();
  });
});
