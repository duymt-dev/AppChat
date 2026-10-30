// Ghi nhận hoá đơn gói đã thanh toán (TIP-010): `paid` → kích hoạt gói (SubscriptionsService.activate) / cộng credit mua thêm
// (WalletService.topup) — cả hai idempotent theo id hoá đơn — rồi đánh dấu `fulfilled_at`, event `billing.invoice_paid` + thông
// báo Owner. Hoá đơn `paid` chưa ghi nhận (admin xác nhận tay trong action, lỗi giữa chừng) được scheduler quét lại (DC-055).
import type { PlatformDb } from '@appchat/db';
import type { PlatformTx } from '../../kernel/actions/action-context';
import type { BillingEventSink, SubscriptionsService } from '../services/subscriptions.service';
import type { WalletService } from '../services/wallet.service';

const PAYABLE = ['pending', 'pending_review', 'expired'] as const;

export interface PaidBy {
  method: 'qr' | 'bank_transfer';
  bankTxId?: string;
  confirmedBy?: string;
}

export class InvoiceFulfiller {
  constructor(
    private readonly db: PlatformDb,
    private readonly wallet: WalletService,
    private readonly subs: SubscriptionsService,
    private readonly sink: BillingEventSink,
    private readonly now: () => Date,
  ) {}

  /** Chuyển `paid` nếu còn chờ (kể cả hết hạn — tiền về muộn vẫn nhận). true = lần này chuyển. */
  async markPaid(t: PlatformTx | PlatformDb, invoiceId: string, by: PaidBy): Promise<boolean> {
    const r = await t.billingInvoice.updateMany({
      where: { id: invoiceId, status: { in: [...PAYABLE] } },
      data: { status: 'paid', paidAt: this.now(), method: by.method, bankTxId: by.bankTxId ?? null, confirmedBy: by.confirmedBy ?? null },
    });
    return r.count === 1;
  }

  /** Kích hoạt / cộng credit cho hoá đơn đã `paid` chưa ghi nhận. Gọi lại an toàn. */
  async fulfil(invoiceId: string): Promise<boolean> {
    const inv = await this.db.billingInvoice.findUnique({ where: { id: invoiceId } });
    if (!inv || inv.status !== 'paid' || inv.fulfilledAt) return false;
    if (inv.kind === 'plan' || inv.kind === 'upgrade_proration') {
      const plan = inv.planId ? await this.db.plan.findUnique({ where: { id: inv.planId }, select: { key: true } }) : null;
      if (plan) await this.subs.activate(inv.workspaceId, plan.key, inv.months ?? 1, inv.id);
    } else if (inv.kind === 'credits' && inv.credits) {
      await this.wallet.topup(inv.workspaceId, Number(inv.credits), {
        refType: 'invoice',
        refId: inv.id,
        note: 'topup',
        meta: { credits: Number(inv.credits).toLocaleString('vi-VN') },
        source: inv.method === 'qr' ? 'qr' : 'bank',
      });
    }
    // addon: hạn mức người / kênh mua thêm áp vào quota ở TIP-039 (DC-056) — ở đây chỉ ghi nhận đã trả.
    const claimed = await this.db.billingInvoice.updateMany({ where: { id: inv.id, fulfilledAt: null }, data: { fulfilledAt: this.now() } });
    if (!claimed.count) return false;
    const ws = await this.db.workspace.findUnique({ where: { id: inv.workspaceId }, select: { ownerUserId: true } });
    await this.sink.emit(inv.workspaceId, [
      { topic: 'billing.invoice_paid', payload: { invoice_id: inv.id, code: inv.code, kind: inv.kind, amount: String(inv.amount) } },
      ...(ws ? [{ topic: 'notify.requested', payload: { kind: 'billing_invoice', to: { user_ids: [ws.ownerUserId] }, params: { code: inv.code }, link: '/settings/billing' } }] : []),
    ]);
    return true;
  }

  /** Scheduler: hoá đơn `paid` chưa ghi nhận → ghi nhận. */
  async fulfilPending(limit = 50): Promise<number> {
    const rows = await this.db.billingInvoice.findMany({ where: { status: 'paid', fulfilledAt: null }, select: { id: true }, take: limit });
    let n = 0;
    for (const r of rows) if (await this.fulfil(r.id)) n++;
    return n;
  }

  /** Scheduler: QR quá 15 phút → `expired` (không đụng `pending_review` — đang chờ đối soát). */
  async expire(limit = 500): Promise<number> {
    const due = await this.db.billingInvoice.findMany({ where: { status: 'pending', expiresAt: { lte: this.now() } }, select: { id: true }, take: limit });
    if (!due.length) return 0;
    const r = await this.db.billingInvoice.updateMany({ where: { id: { in: due.map((d) => d.id) }, status: 'pending' }, data: { status: 'expired' } });
    return r.count;
  }
}
