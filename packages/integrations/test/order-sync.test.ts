// TIP-031: port `order_sync` + adapter `mock` (D31, provider-ports "Đồng bộ đơn") — pull lọc theo `since`, ánh xạ trạng thái sàn về
// 2 trục (COD chỉ "đã thu" khi hoàn tất), webhook ký HMAC, connector ẩn khỏi trang Nền tảng kết nối nhưng kết nối được.
import { describe, expect, it } from 'vitest';
import { MockOrderSyncProvider, connectorRegistry, isOrderSync, mockOrderSignature, type ExternalOrder } from '../src';

const order = (id: string, updated: string, status = 'READY_TO_SHIP', paid = true): ExternalOrder => ({
  external_id: id,
  platform: 'shopee',
  platform_status: status,
  buyer: { id: 'b1', name: 'Người mua' },
  lines: [{ sku: 'SP-1001', name: 'Serum', qty: 1, unit_price: '690000' }],
  total: '690000',
  paid,
  created_at: updated,
  updated_at: updated,
});
const conn = (orders: ExternalOrder[], key = 'k-1') => ({ id: 'c1', mode: 'sandbox' as const, config: { shop_id: 's1', orders: JSON.stringify(orders) }, secrets: { api_key: key } });

describe('MockOrderSyncProvider', () => {
  const p = new MockOrderSyncProvider();

  it('pull: lọc updated_at >= since; config lỗi → rỗng; api_key down → lỗi', async () => {
    const c = conn([order('A', '2026-11-01T01:00:00Z'), order('B', '2026-11-01T03:00:00Z')]);
    expect((await p.pull(c, null)).map((o) => o.external_id)).toEqual(['A', 'B']);
    expect((await p.pull(c, new Date('2026-11-01T02:00:00Z'))).map((o) => o.external_id)).toEqual(['B']);
    expect(await p.pull({ ...c, config: { orders: '{bad' } }, null)).toEqual([]);
    await expect(p.pull(conn([], 'down-1'), null)).rejects.toThrow();
  });

  it('mapStatus: mã sàn → 2 trục; COD chỉ đã thu khi hoàn tất; mã lạ → new', () => {
    expect(p.mapStatus({ platform_status: 'READY_TO_SHIP', paid: true })).toEqual({ status: 'processing', paid: true });
    expect(p.mapStatus({ platform_status: 'SHIPPED', paid: false })).toEqual({ status: 'processing', paid: false });
    expect(p.mapStatus({ platform_status: 'COMPLETED', paid: false })).toEqual({ status: 'completed', paid: true });
    expect(p.mapStatus({ platform_status: 'TO_RETURN', paid: true }).status).toBe('cancelled');
    expect(p.mapStatus({ platform_status: 'WHATEVER', paid: false }).status).toBe('new');
  });

  it('webhook: chữ ký đúng → sự kiện + handleWebhook ra đơn; sai chữ ký → null', () => {
    const c = conn([]);
    const raw = JSON.stringify({ id: 'evt-1', orders: [order('C', '2026-11-01T00:00:00Z')] });
    const ev = p.verifyWebhook(c, { headers: { 'x-mock-signature': mockOrderSignature('k-1', raw) }, rawBody: raw });
    expect(ev).toMatchObject({ id: 'evt-1', kind: 'orders' });
    expect(p.handleWebhook(c, ev!.payload).map((o) => o.external_id)).toEqual(['C']);
    expect(p.verifyWebhook(c, { headers: { 'x-mock-signature': 'x'.repeat(64) }, rawBody: raw })).toBeNull();
  });

  it('registry: ẩn khỏi danh sách hiển thị, kết nối được, có adapter port order_sync', () => {
    expect(connectorRegistry.listed().some((m) => m.key === 'mock_marketplace')).toBe(false);
    expect(connectorRegistry.isConnectable('mock_marketplace')).toBe(true);
    expect(connectorRegistry.byPort('order_sync').map((e) => e.manifest.key)).toEqual(['mock_marketplace']);
    expect(isOrderSync(connectorRegistry.get('mock_marketplace')?.adapter)).toBe(true);
    expect(isOrderSync(connectorRegistry.get('sepay')?.adapter)).toBe(false);
  });
});
