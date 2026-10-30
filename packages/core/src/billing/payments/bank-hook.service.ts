// Webhook ngân hàng nền tảng `POST /hooks/payments/:provider` (Blueprint §4.7, TIP-010): chỉ chạm DB nền tảng. Provider khác nguồn
// đã cấu hình → 404; chữ ký sai → 401; mỗi giao dịch tiền VÀO tài khoản nền tảng → `bank_transaction` (idempotent theo
// provider_tx_id) → khớp hoá đơn theo mã trong nội dung + số tiền ≥ hoá đơn → `paid` → ghi nhận. Không khớp → giữ để đối soát tay.
import { AppError, contentMatches, findInvoiceRef } from '@appchat/shared';
import { MockBankFeedProvider, SepayBankFeed, sepayManifest, type BankFeedProvider, type BankTransaction, type ConnectionCtx } from '@appchat/integrations';
import type { PlatformDb } from '@appchat/db';
import { uuidv7 } from '../../kernel/ids';
import type { InvoiceFulfiller } from './fulfil';
import type { PaymentsEnv } from './payments.env';

const digits = (s: string) => s.replace(/\D/g, '');

export class PlatformBankHook {
  private readonly adapter: BankFeedProvider;
  private readonly conn: ConnectionCtx;

  constructor(
    private readonly db: PlatformDb,
    private readonly env: PaymentsEnv,
    private readonly fulfiller: InvoiceFulfiller,
    private readonly now: () => Date,
  ) {
    const sepay = env.PLATFORM_BANK_FEED === 'sepay';
    this.adapter = sepay ? new SepayBankFeed(sepayManifest) : new MockBankFeedProvider(sepayManifest);
    this.conn = { id: 'platform', mode: sepay ? 'live' : 'sandbox', config: {}, secrets: { api_key: (sepay ? env.SEPAY_WEBHOOK_KEY : env.MOCK_BANK_FEED_KEY) ?? '' } };
  }

  async receive(provider: string, headers: Record<string, string | undefined>, rawBody: string): Promise<{ ok: true; received: number; matched: number }> {
    if (provider !== this.env.PLATFORM_BANK_FEED) throw new AppError('NOT_FOUND', 404);
    const ev = this.adapter.verifyWebhook!(this.conn, { headers, rawBody });
    if (!ev) throw new AppError('UNAUTHENTICATED', 401, { signature: 'invalid' });
    const account = digits(this.env.PLATFORM_BANK_ACCOUNT_NO);
    let received = 0;
    let matched = 0;
    for (const t of this.adapter.parseTransactions(this.conn, ev.payload)) {
      if (t.direction !== 'in' || digits(t.account_number) !== account || !/^\d+$/.test(t.amount)) continue;
      const row = await this.record(provider, t);
      received++;
      if (!row.matchedInvoiceId && (await this.match(row.id, t))) matched++;
    }
    return { ok: true, received, matched };
  }

  private async record(provider: string, t: BankTransaction) {
    await this.db.bankTransaction.createMany({
      data: [
        {
          id: uuidv7(this.now().getTime()),
          provider,
          providerTxId: t.external_id,
          amount: BigInt(t.amount),
          direction: t.direction,
          content: t.content.slice(0, 500),
          accountNo: digits(t.account_number),
          occurredAt: new Date(t.occurred_at),
          raw: { ...t },
        },
      ],
      skipDuplicates: true,
    });
    return this.db.bankTransaction.findUniqueOrThrow({ where: { provider_providerTxId: { provider, providerTxId: t.external_id } } });
  }

  /** Mã INV trong nội dung → hoá đơn; nội dung chứa đủ mã chuyển khoản + đủ tiền → paid + gắn giao dịch (cùng transaction). */
  private async match(bankTxId: string, t: BankTransaction): Promise<boolean> {
    const ref = findInvoiceRef(t.content);
    if (!ref) return false;
    const inv = await this.db.billingInvoice.findUnique({ where: { code: ref } });
    if (!inv || !contentMatches(t.content, inv.transferCode) || BigInt(t.amount) < inv.amount) return false;
    const paid = await this.db.$transaction(async (tx) => {
      if (!(await this.fulfiller.markPaid(tx, inv.id, { method: 'qr', bankTxId }))) return false;
      await tx.bankTransaction.update({ where: { id: bankTxId }, data: { matchedInvoiceId: inv.id } });
      return true;
    });
    if (paid) await this.fulfiller.fulfil(inv.id);
    return paid;
  }
}
