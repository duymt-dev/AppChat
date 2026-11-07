// Đồng bộ đơn sàn (D31, provider-ports "Đồng bộ đơn"): mọi kết nối `order_sync` đang `connected` của workspace → `pull(since)` qua
// adapter (since = lần đồng bộ trước, lùi 10 phút để không sót đơn đổi trễ) → `importExternal` một transaction mỗi đơn + outbox cùng
// transaction. Webhook (`integration.event_received` port order_sync) đi cùng đường qua `handleWebhook`. Lỗi một kết nối → ghi
// `last_error`, kết nối khác vẫn chạy. Poll 5 phút do job `sales.order-sync` (queue riêng `order-sync`).
import { TenantContexts, type TenantDb, type TenantDbResolver } from '@appchat/db';
import { isOrderSync, type ConnectorRegistry, type ExternalOrder, type OrderSyncProvider } from '@appchat/integrations';
import { markDirty, writeOutbox } from '../../../kernel/outbox/outbox';
import type { KeyValueStore } from '../../../kernel/redis';
import { adapterOf, connectionCtx } from '../../../integrations/public';
import { importExternal } from './order-import';

const OVERLAP_MS = 10 * 60_000;

export interface OrderSyncDeps {
  tenants: TenantDbResolver;
  registry: ConnectorRegistry;
  key: Buffer;
  kv: KeyValueStore | null;
  now: () => Date;
}

type ConnRow = NonNullable<Awaited<ReturnType<TenantDb['integrationConnection']['findUnique']>>>;

/** Nhập lô đơn của một kết nối; trả số đơn mới. */
export async function importBatch(db: TenantDb, ws: string, conn: ConnRow, adapter: OrderSyncProvider, orders: ExternalOrder[], now: () => Date) {
  let imported = 0;
  for (const ext of orders) {
    const at = now();
    const r = await db.$transaction(async (tx) => {
      const out = await importExternal(tx, { id: conn.id, createdBy: conn.createdBy }, ext, adapter.mapStatus(ext), at);
      if (out.events.length) await writeOutbox(tx, ws, out.events, at);
      return out;
    });
    if (r.created) imported++;
  }
  return imported;
}

export class OrderSyncService {
  constructor(private readonly d: OrderSyncDeps) {}

  private adapterOf(row: ConnRow): OrderSyncProvider | null {
    const a = adapterOf(this.d.registry, row.connectorKey, row.mode);
    return isOrderSync(a) ? a : null;
  }

  /** Kéo đơn mọi kết nối sàn của workspace. Trả tổng đơn mới (action `order.sync_now` / job poll). */
  async syncWorkspace(ws: string): Promise<{ imported: number; failed: number }> {
    const db = await this.d.tenants.get(TenantContexts.system(ws, 'sales.order-sync'));
    const conns = await db.integrationConnection.findMany({ where: { port: 'order_sync', status: 'connected' } });
    let imported = 0;
    let failed = 0;
    for (const row of conns) {
      const adapter = this.adapterOf(row);
      if (!adapter) continue;
      const started = this.d.now();
      try {
        const since = row.lastSyncAt ? new Date(row.lastSyncAt.getTime() - OVERLAP_MS) : null;
        const orders = await adapter.pull(connectionCtx(row, this.d.key), since);
        imported += await importBatch(db, ws, row, adapter, orders, this.d.now);
        await db.integrationConnection.update({ where: { id: row.id }, data: { lastSyncAt: started, lastError: null } });
      } catch (e) {
        failed++;
        // Lý do từ sàn có thể chứa dữ liệu nhạy cảm → chỉ lưu thông điệp ngắn.
        await db.integrationConnection.update({ where: { id: row.id }, data: { lastError: (e instanceof Error ? e.message : String(e)).slice(0, 300) } });
      }
    }
    if (this.d.kv && conns.length) await markDirty(this.d.kv, ws);
    return { imported, failed };
  }

  /** Sự kiện webhook đã lưu (`integration_event`) của port order_sync → nhập đơn; đánh dấu đã xử lý. */
  async handleEvent(db: TenantDb, ws: string, eventId: string): Promise<number> {
    const ev = await db.integrationEvent.findUnique({ where: { id: eventId } });
    if (!ev || ev.processedAt) return 0;
    const row = await db.integrationConnection.findUnique({ where: { id: ev.connectionId } });
    const adapter = row ? this.adapterOf(row) : null;
    if (!row || !adapter || row.status === 'disconnected') return 0;
    const n = await importBatch(db, ws, row, adapter, adapter.handleWebhook(connectionCtx(row, this.d.key), ev.payload), this.d.now);
    await db.integrationEvent.update({ where: { id: ev.id }, data: { processedAt: this.d.now() } });
    return n;
  }
}
