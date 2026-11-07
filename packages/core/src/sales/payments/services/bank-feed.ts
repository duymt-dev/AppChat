// Bank feed của DN (COMMERCE §5; Blueprint §4.7 `POST /hooks/tenant-payments/:provider/:feedId`): `feed_id` tra `tenant_bank_feed_route`
// (DB nền tảng) → DB tenant → feed đang bật + kết nối `bank_feed` (bí mật ở `integration_connection`) → adapter ĐÚNG chế độ kiểm chữ ký
// trên byte gốc → chuẩn hoá cả request (sai → 400, không ghi gì) → mỗi giao dịch một biên nhận chuẩn tắc + outbox cùng transaction →
// ACK (TIP-012b P2, DC-383). Không khớp / ghi nhận / gọi LLM trước ACK: consumer ROLE=jobs chạy `bank_feed.ingest` (bank/ingress.ts).
import { AppError } from '@appchat/shared';
import { MAX_BATCH, accountOrEmpty, isProviderError, type BankFeedProvider, type BankTransaction, type ConnectorRegistry } from '@appchat/integrations';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import { markDirty } from '../../../kernel/outbox/outbox';
import type { KeyValueStore } from '../../../kernel/redis';
import { adapterOf, connectionCtx } from '../../../integrations/public';
import { acceptReceipts } from '../bank/receipt';

export { paidNotice } from '../bank/reconcile';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const webhookPathOf = (provider: string, feedId: string) => `/hooks/tenant-payments/${provider}/${feedId}`;

export interface BankHookDeps {
  platform: Pick<PlatformDb, 'tenantBankFeedRoute' | 'workspace'>;
  tenants: TenantDbResolver;
  registry: ConnectorRegistry;
  key: Buffer;
  kv: KeyValueStore | null;
  now: () => Date;
}

/** Kết quả ACK: số biên nhận mới / trùng / bỏ qua — không phải "đã khớp" (khớp chạy sau ở worker). */
export interface HookAck {
  ok: true;
  accepted: number;
  duplicate: number;
  ignored: number;
}

export class TenantBankHook {
  constructor(private readonly d: BankHookDeps) {}

  async receive(provider: string, feedId: string, headers: Record<string, string | undefined>, rawBody: string): Promise<HookAck> {
    // Feed lạ / provider lệch / đã ngắt → cùng 404 (không lộ feed nào tồn tại).
    const notFound = () => new AppError('NOT_FOUND', 404);
    if (!UUID.test(feedId)) throw notFound();
    const route = await this.d.platform.tenantBankFeedRoute.findUnique({ where: { feedId } });
    if (!route || route.provider !== provider) throw notFound();
    const db = await this.d.tenants.get(TenantContexts.fromRoute(route.workspaceId, 'bank-feed'));
    const feed = await db.tenantBankFeed.findUnique({ where: { id: feedId } });
    const conn = feed ? await db.integrationConnection.findUnique({ where: { id: feed.connectionId } }) : null;
    if (!feed || feed.status !== 'active' || !conn || conn.status === 'disconnected' || conn.connectorKey !== provider) throw notFound();
    // Adapter đúng chế độ đã lưu của kết nối (TIP-012b §1.1) — live không bao giờ dùng giả lập; không có → 404 như feed lạ.
    const adapter = adapterOf<BankFeedProvider>(this.d.registry, provider, conn.mode);
    if (!adapter?.verifyWebhook || !adapter.parseTransactions) throw notFound();
    const ctx = connectionCtx(conn, this.d.key);
    const ev = adapter.verifyWebhook(ctx, { headers, rawBody });
    if (!ev) throw new AppError('UNAUTHENTICATED', 401, { signature: 'invalid' });

    // Chuẩn hoá cả request trước mọi ghi (§2.2): một giao dịch hỏng → 400, không ghi phần nào.
    let txs: BankTransaction[];
    try {
      txs = adapter.parseTransactions(ctx, ev.payload);
    } catch (e) {
      if (isProviderError(e)) throw new AppError('VALIDATION_FAILED', 400, { payload: e.field ?? e.code });
      throw e;
    }
    if (txs.length > MAX_BATCH) throw new AppError('VALIDATION_FAILED', 400, { payload: 'too_many' });
    const feedAccount = accountOrEmpty(feed.accountNo);
    const now = this.d.now();
    const r = await acceptReceipts(db, route.workspaceId, txs.map((tx) => ({ provider, feedId: feed.id, feedAccount, tx })), now);
    if (r.accepted || r.ignored) await db.tenantBankFeed.update({ where: { id: feed.id }, data: { lastTxAt: now } });
    await db.integrationConnection.update({ where: { id: conn.id }, data: { lastEventAt: now } });
    if (r.accepted && this.d.kv) await markDirty(this.d.kv, route.workspaceId);
    return { ok: true, ...r };
  }
}
