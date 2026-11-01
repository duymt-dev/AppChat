// Bank feed của DN (COMMERCE §5; Blueprint §4.7 `POST /hooks/tenant-payments/:provider/:feedId`): `feed_id` tra `tenant_bank_feed_route`
// (DB nền tảng) → DB tenant → feed đang bật + kết nối `bank_feed` (bí mật ở `integration_connection`) → adapter kiểm chữ ký → mỗi giao
// dịch tiền VÀO đúng tài khoản: `bank_tx` idempotent theo mã giao dịch provider → khớp mã `TT…` + đúng số còn phải thu thì khoản thu
// `confirmed` (phiếu thu, cộng đơn); lệch / thiếu mã / đề nghị đã đóng → hàng "Cần đối soát" + thông báo người có `payment.record`.
import { AppError, INVOICE_PAYABLE, createFmt, matchBankTx } from '@appchat/shared';
import type { BankFeedProvider, ConnectorRegistry } from '@appchat/integrations';
import { TenantContexts, type PlatformDb, type TenantDb, type TenantDbResolver } from '@appchat/db';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { uuidv7 } from '../../../kernel/ids';
import { markDirty, writeOutbox } from '../../../kernel/outbox/outbox';
import type { KeyValueStore } from '../../../kernel/redis';
import { connectionCtx } from '../../../integrations/public';
import { localDay, recordInvoicePayment } from './payment-write';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SYSTEM = { type: 'system', id: null };
const digits = (s: string) => s.replace(/\D/g, '');

export const webhookPathOf = (provider: string, feedId: string) => `/hooks/tenant-payments/${provider}/${feedId}`;

export interface BankHookDeps {
  platform: Pick<PlatformDb, 'tenantBankFeedRoute' | 'workspace'>;
  tenants: TenantDbResolver;
  registry: ConnectorRegistry;
  key: Buffer;
  kv: KeyValueStore | null;
  now: () => Date;
}

export class TenantBankHook {
  constructor(private readonly d: BankHookDeps) {}

  async receive(provider: string, feedId: string, headers: Record<string, string | undefined>, rawBody: string): Promise<{ ok: true; received: number; matched: number }> {
    // Feed lạ / provider lệch / đã ngắt → cùng 404 (không lộ feed nào tồn tại).
    const notFound = () => new AppError('NOT_FOUND', 404);
    if (!UUID.test(feedId)) throw notFound();
    const route = await this.d.platform.tenantBankFeedRoute.findUnique({ where: { feedId } });
    const adapter = this.d.registry.get(provider)?.adapter as BankFeedProvider | undefined;
    if (!route || route.provider !== provider || !adapter?.verifyWebhook || !adapter.parseTransactions) throw notFound();
    const db = await this.d.tenants.get(TenantContexts.fromRoute(route.workspaceId, 'bank-feed'));
    const feed = await db.tenantBankFeed.findUnique({ where: { id: feedId } });
    const conn = feed ? await db.integrationConnection.findUnique({ where: { id: feed.connectionId } }) : null;
    if (!feed || feed.status !== 'active' || !conn || conn.status === 'disconnected') throw notFound();
    const ctx = connectionCtx(conn, this.d.key);
    const ev = adapter.verifyWebhook(ctx, { headers, rawBody });
    if (!ev) throw new AppError('UNAUTHENTICATED', 401, { signature: 'invalid' });

    const w = await this.d.platform.workspace.findUnique({ where: { id: route.workspaceId }, select: { timezone: true } });
    const timeZone = w?.timezone ?? 'Asia/Ho_Chi_Minh';
    const account = digits(feed.accountNo);
    let received = 0;
    let matched = 0;
    let dirty = false;
    for (const t of adapter.parseTransactions(ctx, ev.payload)) {
      if (t.direction !== 'in' || !/^\d+$/.test(t.amount) || BigInt(t.amount) <= 0n) continue;
      if (account && digits(t.account_number) && digits(t.account_number) !== account) continue;
      const r = await this.ingest(db, route.workspaceId, feed.id, t, timeZone);
      if (!r) continue;
      received++;
      dirty = true;
      if (r === 'matched') matched++;
    }
    if (received) await db.tenantBankFeed.update({ where: { id: feed.id }, data: { lastTxAt: this.d.now() } });
    if (dirty && this.d.kv) await markDirty(this.d.kv, route.workspaceId);
    return { ok: true, received, matched };
  }

  /** Một giao dịch: ghi + khớp trong cùng transaction. Đã nhận trước đó → null (idempotent). */
  private async ingest(db: TenantDb, ws: string, feedId: string, t: { external_id: string; amount: string; content: string; account_number: string; occurred_at: string }, timeZone: string) {
    const now = this.d.now();
    return db.$transaction(async (tx) => {
      const id = uuidv7(now.getTime());
      const amount = BigInt(t.amount);
      const base = { id, feedId, externalId: t.external_id, amount, content: t.content.slice(0, 500), accountNo: digits(t.account_number), occurredAt: new Date(t.occurred_at), createdAt: now };
      const ins = await tx.bankTx.createMany({ data: [{ ...base, status: 'needs_review', reason: 'missing_code' }], skipDuplicates: true });
      if (ins.count === 0) return null;
      const { decision, invoice } = await this.decide(tx, t.content, amount);
      if (decision.kind === 'match' && invoice) {
        const r = await recordInvoicePayment(tx, invoice, { amount, method: 'bank_transfer', reference: t.external_id.slice(0, 100), paidAt: base.occurredAt, bankTxId: id, actor: SYSTEM }, localDay(now, timeZone), now);
        await tx.bankTx.update({ where: { id }, data: { status: 'matched', reason: null, invoiceId: invoice.id, paymentId: r.paymentId } });
        const contact = await tx.contact.findUnique({ where: { id: invoice.contactId }, select: { name: true } });
        await writeOutbox(tx, ws, [{ topic: 'bank_tx.received', payload: { bank_tx_id: id, amount: t.amount, status: 'matched', reason: null } }, ...r.events, ...paidNotice(invoice, contact?.name ?? '', amount)], now);
        return 'matched' as const;
      }
      const reason = decision.kind === 'review' ? decision.reason : 'missing_code';
      await tx.bankTx.update({ where: { id }, data: { reason, suggestedInvoiceId: invoice?.id ?? null } });
      const money = createFmt({ locale: 'vi', timeZone }).money(t.amount);
      await writeOutbox(
        tx,
        ws,
        [
          { topic: 'bank_tx.received', payload: { bank_tx_id: id, amount: t.amount, status: 'needs_review', reason } },
          { topic: 'notify.requested', payload: { kind: 'bank_review', to: { permission: 'payment.record' }, params: { amount: money }, link: '/invoices?reconcile=1' } },
        ],
        now,
      );
      return 'review' as const;
    });
  }

  /** Tra đề nghị theo mã trong nội dung (khoá dòng) → quyết định khớp. */
  private async decide(tx: TenantTx, content: string, amount: bigint) {
    const probe = matchBankTx(content, amount, null);
    const code = probe.kind === 'review' ? probe.code : null;
    const row = code ? await tx.invoice.findUnique({ where: { code }, select: { id: true } }) : null;
    if (!row) return { decision: probe, invoice: null };
    await tx.$queryRaw`SELECT 1 FROM invoice WHERE id = ${row.id}::uuid FOR UPDATE`;
    const invoice = (await tx.invoice.findUnique({ where: { id: row.id } }))!;
    const left = INVOICE_PAYABLE.includes(invoice.status) ? invoice.amount - invoice.paidAmount : 0n;
    return { decision: matchBankTx(content, amount, { code: invoice.code, status: invoice.status, left }), invoice };
  }
}

/** Thông báo người phụ trách: khách đã thanh toán. */
export function paidNotice(i: { ownerUserId: string | null; code: string }, contact: string, amount: bigint) {
  if (!i.ownerUserId) return [];
  return [{ topic: 'notify.requested', payload: { kind: 'payment_received', to: { user_ids: [i.ownerUserId] }, params: { contact: contact.slice(0, 200), amount: createFmt({ locale: 'vi' }).money(String(amount)), code: i.code }, link: `/invoices?q=${i.code}` } }];
}
