// TIP-031: route mock domain đơn hàng đúng shape đọc dùng chung với API thật (packages/shared/src/api/orders.ts) + luồng ghi theo
// ORDER_FLOW (sai trạng thái → INVALID_TRANSITION; đơn sàn khoá dòng; processing đã thu không sửa dòng; mã DH- — D52).
import { beforeEach, describe, expect, it } from 'vitest';
import { orderRowSchema, ordersMetaSchema, ordersPageSchema } from '@appchat/shared';
import { mockTransport } from './mock-transport';
import { mockDb, setMockRole } from './store';
import { createOrdersState } from './domains/orders';
import { ordersHandlers } from './domains/orders-actions';

const issues = (r: { success: boolean; error?: { issues: unknown[] } }) => (r.success ? [] : r.error!.issues);
const run = (id: string, input: unknown) => ordersHandlers[id]!.execute(mockDb(), input as never) as Record<string, unknown>;
const code = async (fn: () => unknown) => {
  try {
    await fn();
    return null;
  } catch (e) {
    return (e as { error?: { code: string } }).error?.code ?? 'throw';
  }
};

describe('mock đơn hàng — shape FE ↔ BE', () => {
  beforeEach(() => {
    mockDb().orders = createOrdersState();
    setMockRole('owner');
  });

  it('GET /orders (D42) · /orders/:id · /meta (+ theo đơn)', async () => {
    expect(issues(ordersPageSchema.safeParse(await mockTransport.get('/orders', { page: 1, limit: 5 })))).toEqual([]);
    expect(issues(orderRowSchema.safeParse(await mockTransport.get('/orders/ord_290405')))).toEqual([]);
    expect(issues(ordersMetaSchema.safeParse(await mockTransport.get('/orders/meta')))).toEqual([]);
    const one = ordersMetaSchema.parse(await mockTransport.get('/orders/meta', { order_id: 'ord_290411' }));
    expect(one.crm.ltv).not.toBe('0');
  });

  it('luồng: tạo DH-290412 → xác nhận → hoàn tất (điểm); hoàn tất lại → INVALID_TRANSITION; cọc > tổng → 422', async () => {
    const c = run('order.create', { contact_id: 'ct_lan', items: [{ name: 'X', qty: 1, unit_price: '1000000', tax_rate: 0 }] }) as { order_id: string; code: string };
    expect(c.code).toBe('DH-290412');
    expect(await code(() => run('order.complete', { order_id: c.order_id }))).toBe('INVALID_TRANSITION');
    run('order.confirm', { order_id: c.order_id });
    expect(run('order.complete', { order_id: c.order_id })).toMatchObject({ points: 100 });
    expect(await code(() => run('order.cancel', { order_id: c.order_id, reason: 'x' }))).toBe('INVALID_TRANSITION');
    expect(await code(() => run('order.create', { contact_id: 'ct_lan', items: [{ name: 'X', qty: 1, unit_price: '100', tax_rate: 0 }], deposit_amount: '200' }))).toBe('VALIDATION_FAILED');
  });

  it('đơn sàn khoá dòng / cọc; processing đã thu không sửa dòng; huỷ đã thu → chờ hoàn tiền', async () => {
    expect(await code(() => run('order.update', { order_id: 'ord_290405', patch: { items: [] } }))).toBe('INVALID_STATE');
    expect(await code(() => run('order.set_deposit', { order_id: 'ord_290405', deposit_amount: '1' }))).toBe('INVALID_STATE');
    run('order.update', { order_id: 'ord_290405', patch: { note: 'ok' } });
    expect(await code(() => run('order.update', { order_id: 'ord_290411', patch: { items: [] } }))).toBe('INVALID_STATE');
    expect(run('order.cancel', { order_id: 'ord_290411', reason: 'đổi ý' })).toMatchObject({ refund_requested: true });
  });

  it('scope: sales chỉ thấy đơn mình phụ trách', async () => {
    setMockRole('sales');
    const r = ordersPageSchema.parse(await mockTransport.get('/orders', { page: 1, limit: 20 }));
    expect(r.data.every((o) => o.owner_user_id === 'u_tram')).toBe(true);
    expect(await code(() => mockTransport.get('/orders/ord_290411'))).toBe('NOT_FOUND');
  });
});
