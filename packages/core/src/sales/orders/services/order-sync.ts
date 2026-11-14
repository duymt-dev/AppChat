// Đồng bộ đơn sàn (D31, provider-ports "Đồng bộ đơn"): mọi kết nối `order_sync` đang `connected` của workspace → `pull(since)` qua
// adapter (since = lần đồng bộ trước, lùi 10 phút để không sót đơn đổi trễ) → `importExternal` một transaction mỗi đơn + outbox cùng
// transaction. Webhook (`integration.event_received` port order_sync) đi cùng đường qua `handleWebhook`. Lỗi một kết nối → ghi
// `last_error`, kết nối khác vẫn chạy. Poll 5 phút do job `sales.order-sync` (queue riêng `order-sync`).
// TIP-015f §3.5–§3.7: mỗi đơn kiểm payload runtime TRƯỚC mọi ghi; đơn hỏng / lỗi ghi → `failed` (che lý do), cursor / processedAt KHÔNG tiến
// qua nó (lô hợp lệ cùng đợt vẫn ghi bền và phát lại idempotent). Đơn của người mua đã xoá → biên nhận chặn (`blocked`, không phải
// imported). Sau một lần kéo thành công, thử lại biên nhận `pending` của kết nối theo khách hiện tại (khôi phục rồi mới nhập được).
import { TenantContexts, type TenantDb, type TenantDbResolver } from '@appchat/db';
import { isOrderSync, stockMasterOf, type ConnectorRegistry, type OrderSyncProvider } from '@appchat/integrations';
import type { SystemOutput } from '@appchat/actions';
import type { ActionExecutor } from '../../../kernel/actions/executor';
import { runSystemAction, settled, type SystemRunDeps } from '../../../kernel/actions/system';
import { markDirty } from '../../../kernel/outbox/outbox';
import type { KeyValueStore } from '../../../kernel/redis';
import { adapterOf, connectionCtx } from '../../../integrations/public';
import { orderImportTrigger, withStagedOrder, type StagedOrder } from '../system/import';
import { checkExternalOrder } from './external-order-payload';
import { pendingBlocked } from './blocked-imports';
import { syncConnectionStock } from './stock-sync';

const OVERLAP_MS = 10 * 60_000;

export interface OrderSyncDeps {
  tenants: TenantDbResolver;
  /** TIP-003c: mỗi bản đơn đã kiểm áp qua action riêng `order.system_import`. */
  executor: Pick<ActionExecutor, 'execute'>;
  registry: ConnectorRegistry;
  key: Buffer;
  kv: KeyValueStore | null;
  now: () => Date;
}

type ConnRow = NonNullable<Awaited<ReturnType<TenantDb['integrationConnection']['findUnique']>>>;

export interface BatchCounts {
  imported: number;
  blocked: number;
  failed: number;
  /** Lý do lỗi đã che (đường dẫn trường + mã) — không payload. */
  errors: string[];
}

const empty = (): BatchCounts => ({ imported: 0, blocked: 0, failed: 0, errors: [] });
const add = (a: BatchCounts, b: BatchCounts): BatchCounts => ({ imported: a.imported + b.imported, blocked: a.blocked + b.blocked, failed: a.failed + b.failed, errors: [...a.errors, ...b.errors].slice(0, 20) });

/** Nhập lô đơn của một kết nối; mỗi đơn một action riêng (một transaction). Trả số imported / blocked / failed. Cùng bản đã áp (biên
 *  nhận kết thúc) → bỏ qua, không đếm. `milestone` (thử lại biên nhận chặn) tách biên nhận theo phiên bản khách. */
export async function importBatch(sys: SystemRunDeps, ws: string, conn: ConnRow, adapter: OrderSyncProvider, orders: unknown[], now: () => Date, sourceEventId: string | null = null, milestone = ''): Promise<BatchCounts> {
  const c = empty();
  for (const raw of orders) {
    const chk = checkExternalOrder(raw, now());
    if (!chk.ok) {
      c.failed++;
      c.errors.push(chk.reason);
      continue;
    }
    const staged: StagedOrder = { conn: { id: conn.id, createdBy: conn.createdBy, stockMaster: stockMasterOf(conn.config as Record<string, unknown>) }, order: chk.order, mapped: adapter.mapStatus(chk.order), meta: { hash: chk.hash, updatedAt: chk.updatedAt, sourceEventId } };
    const t = orderImportTrigger(ws, staged, milestone);
    try {
      if (await settled(sys, t)) continue;
      const r = await withStagedOrder(t, staged, () => runSystemAction<SystemOutput>(sys.executor, sys.tenants, t));
      const out = (r.data as { result: SystemOutput }).result;
      if (out.reason_code === 'created') c.imported++;
      else if (out.reason_code?.startsWith('blocked_')) c.blocked++;
    } catch (e) {
      c.failed++;
      c.errors.push(e instanceof Error ? e.name.slice(0, 60) : 'error');
    }
  }
  return c;
}

/** Thử lại biên nhận chặn `pending` của kết nối (payload đã kiểm lúc nhận; kiểm lại theo đồng hồ hiện tại). */
async function retryBlocked(sys: SystemRunDeps, db: TenantDb, ws: string, conn: ConnRow, adapter: OrderSyncProvider, now: () => Date): Promise<BatchCounts> {
  const rows = await pendingBlocked(db, conn.id);
  let c = empty();
  for (const r of rows) {
    // Thế hệ thử lại = phiên bản khách tham chiếu (khôi phục / gộp tăng version) — cùng trạng thái khách không thử lại cùng bản hai lần.
    const ref = r.contactRef ? await db.contact.findUnique({ where: { id: r.contactRef }, select: { version: true } }) : null;
    const b = await importBatch(sys, ws, conn, adapter, [r.payload], now, r.sourceEventId, `retry:${r.contactRef ?? 'none'}:${ref?.version ?? 0}`);
    // Vẫn bị chặn → không đếm lại là blocked mới (đã đếm lúc nhận).
    c = add(c, { ...b, blocked: 0 });
  }
  return c;
}

export class OrderSyncService {
  constructor(private readonly d: OrderSyncDeps) {}

  private adapterOf(row: ConnRow): OrderSyncProvider | null {
    const a = adapterOf(this.d.registry, row.connectorKey, row.mode);
    return isOrderSync(a) ? a : null;
  }

  /** Kéo đơn mọi kết nối sàn của workspace (và đối soát tồn ngoài khi `stock_master = external`). Trả tổng đơn mới. */
  async syncWorkspace(ws: string): Promise<{ imported: number; blocked: number; failed: number; stockAdjusted: number; unmatchedSkus: string[] }> {
    const db = await this.d.tenants.get(TenantContexts.system(ws, 'sales.order-sync'));
    const conns = await db.integrationConnection.findMany({ where: { port: 'order_sync', status: 'connected' } });
    let total = empty();
    let stockAdjusted = 0;
    const unmatched = new Set<string>();
    for (const row of conns) {
      const adapter = this.adapterOf(row);
      if (!adapter) continue;
      const started = this.d.now();
      try {
        const since = row.lastSyncAt ? new Date(row.lastSyncAt.getTime() - OVERLAP_MS) : null;
        const orders = await adapter.pull(connectionCtx(row, this.d.key), since);
        const c = await importBatch(this.d, ws, row, adapter, orders, this.d.now);
        const blocked = await retryBlocked(this.d, db, ws, row, adapter, this.d.now);
        const stock = await syncConnectionStock(this.d, db, ws, row, adapter, this.d.key);
        stockAdjusted += stock.adjusted;
        for (const sku of stock.unmatchedSkus) unmatched.add(sku);
        const combined = add(add(c, blocked), { imported: 0, blocked: 0, failed: stock.failed, errors: stock.errors });
        total = add(total, combined);
        // Có đơn hỏng / lỗi ghi → cursor không tiến (lần sau kéo lại, đơn đã ghi phát lại idempotent).
        await db.integrationConnection.update({
          where: { id: row.id },
          data: combined.failed ? { lastError: `items_failed:${combined.failed} ${combined.errors.slice(0, 3).join(',')}`.slice(0, 300) } : { lastSyncAt: started, lastError: null },
        });
      } catch (e) {
        total = add(total, { ...empty(), failed: 1 });
        // Lý do từ sàn có thể chứa dữ liệu nhạy cảm → chỉ lưu thông điệp ngắn.
        await db.integrationConnection.update({ where: { id: row.id }, data: { lastError: (e instanceof Error ? e.message : String(e)).slice(0, 300) } });
      }
    }
    if (this.d.kv && conns.length) await markDirty(this.d.kv, ws);
    return { imported: total.imported, blocked: total.blocked, failed: total.failed, stockAdjusted, unmatchedSkus: [...unmatched] };
  }

  /** Sự kiện webhook đã lưu (`integration_event`) của port order_sync → nhập đơn; đánh dấu đã xử lý. */
  async handleEvent(db: TenantDb, ws: string, eventId: string): Promise<number> {
    const ev = await db.integrationEvent.findUnique({ where: { id: eventId } });
    if (!ev || ev.processedAt) return 0;
    const row = await db.integrationConnection.findUnique({ where: { id: ev.connectionId } });
    const adapter = row ? this.adapterOf(row) : null;
    if (!row || !adapter || row.status === 'disconnected') return 0;
    const c = await importBatch(this.d, ws, row, adapter, adapter.handleWebhook(connectionCtx(row, this.d.key), ev.payload), this.d.now, ev.id);
    // Đơn hỏng / lỗi ghi → sự kiện chưa xử lý xong (thử lại); đơn bị chặn đã có biên nhận bền → coi là xử lý xong.
    if (!c.failed) await db.integrationEvent.update({ where: { id: ev.id }, data: { processedAt: this.d.now() } });
    return c.imported;
  }
}
