// Đồng bộ đơn sàn chạy nền (D31, Blueprint §1.3 queue `order-sync`): scheduler `sales.order-sync` mỗi 5 phút quét workspace đang hoạt
// động, workspace có kết nối port `order_sync` thì `pull` (OrderSyncService); consumer `sales.order-sync` nhận `integration.event_received`
// (webhook sàn đã lưu `integration_event`) → nhập đơn. Lỗi một workspace không chặn workspace khác.
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import type { EventConsumer } from '../../kernel/events/consumer';
import type { OrderSyncService } from '../orders/services/order-sync';

export const ORDER_SYNC_QUEUE = 'order-sync';
export const ORDER_SYNC_JOB = 'sales.order-sync';
export const ORDER_SYNC_EVERY_MS = 5 * 60_000;

/** Quét mọi workspace đang hoạt động có kết nối sàn. */
export async function syncOrders(d: { platform: Pick<PlatformDb, 'workspace'>; tenants: TenantDbResolver; sync: OrderSyncService; onError?: (ws: string, err: unknown) => void }) {
  const wss = await d.platform.workspace.findMany({ where: { dbStatus: 'active' }, select: { id: true } });
  let imported = 0;
  let stockAdjusted = 0;
  for (const w of wss) {
    try {
      const db = await d.tenants.get(TenantContexts.system(w.id, ORDER_SYNC_JOB));
      if (!(await db.integrationConnection.count({ where: { port: 'order_sync', status: 'connected' } }))) continue;
      const r = await d.sync.syncWorkspace(w.id);
      imported += r.imported;
      stockAdjusted += r.stockAdjusted;
    } catch (err) {
      d.onError?.(w.id, err);
    }
  }
  return { imported, stockAdjusted };
}

/** Webhook sàn đã lưu → nhập đơn (idempotent theo `integration_event.processed_at` + unique (kết nối, mã ngoài)). */
export const orderSyncConsumer = (sync: OrderSyncService): EventConsumer => ({
  name: 'sales.order-sync',
  topics: ['integration.event_received'],
  async handle(e, db) {
    const p = e.payload as { port?: string; event_id?: string };
    if (p.port === 'order_sync' && p.event_id) await sync.handleEvent(db, e.workspaceId, p.event_id);
  },
});
