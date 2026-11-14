// OrderSyncProvider `mock` (provider-ports §9, D31): sàn thử nghiệm cho sandbox / test khi chưa có adapter thật (Shopee, TikTok Shop,
// Sapo… — P2). Đơn lấy từ `config.orders` (JSON mảng ExternalOrder — test / demo tự nạp) lọc theo `updated_at >= since`. Ánh xạ trạng thái
// theo mã kiểu Shopee. Webhook: header `x-mock-signature` = HMAC-SHA256(api_key, raw body) như bank feed mock.
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { ExternalOrder, MappedStatus, OrderSyncProvider, StockPullResult, StockSnapshotItem } from '../../ports/order-sync';
import type { ConnectionCtx, ConnectorManifest, WebhookEvent, WebhookRequest } from '../../types';

export const mockMarketplaceManifest: ConnectorManifest = {
  key: 'mock_marketplace',
  port: 'order_sync',
  name: 'Sàn thử nghiệm',
  logo: 'mock_marketplace',
  color: '#EE4D2D',
  group: 'commerce',
  status: 'beta',
  auth: {
    kind: 'api_key',
    fields: [
      { key: 'api_key', secret: true },
      { key: 'shop_id' },
      { key: 'orders', optional: true },
      { key: 'stock_master', optional: true },
      { key: 'stock_snapshots', optional: true },
    ],
  },
  webhooks: true,
  modes: ['sandbox'],
  hidden: true,
  validate({ config }) {
    if (config.stock_master && config.stock_master !== 'appchat' && config.stock_master !== 'external') {
      return { stock_master: 'invalid' };
    }
    return null;
  },
};

const STATUS: Record<string, MappedStatus['status']> = {
  UNPAID: 'new',
  READY_TO_SHIP: 'processing',
  PROCESSED: 'processing',
  SHIPPED: 'processing',
  TO_CONFIRM_RECEIVE: 'processing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  IN_CANCEL: 'cancelled',
  TO_RETURN: 'cancelled',
};

const sign = (apiKey: string, rawBody: string) => createHmac('sha256', apiKey).update(rawBody).digest('hex');

function parseOrders(raw: unknown): ExternalOrder[] {
  if (Array.isArray(raw)) return raw as ExternalOrder[];
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? (v as ExternalOrder[]) : [];
  } catch {
    return [];
  }
}

function parseStockSnapshots(raw: unknown, cursor: string | null): StockPullResult {
  if (!raw) return { items: [], next_cursor: cursor };
  let v: unknown = raw;
  if (typeof raw === 'string') {
    if (!raw.trim()) return { items: [], next_cursor: cursor };
    try {
      v = JSON.parse(raw) as unknown;
    } catch {
      return { items: [], next_cursor: cursor };
    }
  }
  const check = (arr: unknown[]): StockSnapshotItem[] =>
    arr.filter(
      (x): x is StockSnapshotItem =>
        !!x &&
        typeof x === 'object' &&
        typeof (x as StockSnapshotItem).sku === 'string' &&
        (x as StockSnapshotItem).sku.trim().length > 0 &&
        typeof (x as StockSnapshotItem).snapshot_id === 'string' &&
        (x as StockSnapshotItem).snapshot_id.trim().length > 0 &&
        typeof (x as StockSnapshotItem).on_hand === 'number' &&
        Number.isInteger((x as StockSnapshotItem).on_hand) &&
        typeof (x as StockSnapshotItem).as_of === 'string' &&
        !Number.isNaN(Date.parse((x as StockSnapshotItem).as_of)),
    );
  if (Array.isArray(v)) return { items: check(v), next_cursor: cursor };
  if (v && typeof v === 'object') {
    const obj = v as { items?: unknown; next_cursor?: string | null; [k: string]: unknown };
    if (Array.isArray(obj.items)) return { items: check(obj.items), next_cursor: obj.next_cursor ?? cursor };
    const page = obj[cursor ?? 'initial'];
    if (Array.isArray(page)) return { items: check(page), next_cursor: cursor };
    if (page && typeof page === 'object' && Array.isArray((page as { items?: unknown }).items)) {
      const p = page as { items: unknown[]; next_cursor?: string | null };
      return { items: check(p.items), next_cursor: p.next_cursor ?? cursor };
    }
  }
  return { items: [], next_cursor: cursor };
}

export class MockOrderSyncProvider implements OrderSyncProvider {
  constructor(readonly manifest: ConnectorManifest = mockMarketplaceManifest) {}

  async test(conn: ConnectionCtx): Promise<void> {
    if ((conn.secrets.api_key ?? '').startsWith('bad')) throw new Error('mock: api_key bị từ chối');
  }

  async pull(conn: ConnectionCtx, since: Date | null): Promise<ExternalOrder[]> {
    if ((conn.secrets.api_key ?? '').startsWith('down')) throw new Error('mock: sàn không phản hồi');
    return parseOrders(conn.config.orders).filter((o) => !since || new Date(o.updated_at) >= since);
  }

  async pullStock(conn: ConnectionCtx, cursor: string | null): Promise<StockPullResult> {
    if ((conn.secrets.api_key ?? '').startsWith('down')) throw new Error('mock: sàn không phản hồi');
    return parseStockSnapshots(conn.config.stock_snapshots, cursor);
  }

  verifyWebhook(conn: ConnectionCtx, req: WebhookRequest): WebhookEvent | null {
    const got = req.headers['x-mock-signature'] ?? '';
    const want = sign(conn.secrets.api_key ?? '', req.rawBody);
    if (got.length !== want.length || !timingSafeEqual(Buffer.from(got), Buffer.from(want))) return null;
    try {
      const body = JSON.parse(req.rawBody) as { id?: string; orders?: unknown };
      return typeof body.id === 'string' && body.id ? { id: body.id, kind: 'orders', payload: body } : null;
    } catch {
      return null;
    }
  }

  handleWebhook(_conn: ConnectionCtx, payload: unknown): ExternalOrder[] {
    return parseOrders((payload as { orders?: unknown }).orders);
  }

  mapStatus(o: Pick<ExternalOrder, 'platform_status' | 'paid'>): MappedStatus {
    const status = STATUS[o.platform_status.toUpperCase()] ?? 'new';
    // COD: sàn chỉ báo đã thu khi hoàn tất (COMMERCE §4b).
    return { status, paid: o.paid || status === 'completed' };
  }
}

export { sign as mockOrderSignature };
