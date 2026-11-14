// Ghi nhận hoá đơn gói đã thanh toán (TIP-010 → TIP-039): `paid` → action system-only `billing.apply_invoice` qua ActionExecutor (sổ thao tác
// xuyên DB 045b): ghi nhận theo ẢNH CHỤP giá lúc tạo (kỳ mới / gia hạn / nâng gói / addon / gói credit) trong một transaction nền tảng, khoá
// chống ghi đôi = `fulfilled_at` giành cùng transaction; event + thông báo Owner sang outbox tenant có biên nhận (khôi phục được). Hoá đơn
// `paid` chưa ghi nhận (admin xác nhận tay, lỗi giữa chừng) được scheduler quét lại (DC-055). Không có executor (process thiếu APP_ENC_KEY)
// → ghi nhận trực tiếp + event sau commit (đường cũ, không bền qua crash).
import type { PlatformDb } from '@appchat/db';
import type { ActionContext, PlatformTx } from '../../kernel/actions/action-context';
import type { ActionExecutor } from '../../kernel/actions/executor';
import { applyPaidInvoice } from '../lifecycle/apply-invoice';
import { BILLING_ACTOR } from '../lifecycle/types';
import { domainTrigger, runSystemAction } from '../../kernel/actions/system';
import type { BillingEventSink } from '../services/subscriptions.service';
import type { WalletService } from '../services/wallet.service';

const PAYABLE = ['pending', 'pending_review', 'expired'] as const;

export interface PaidBy {
  method: 'qr' | 'bank_transfer';
  bankTxId?: string;
  confirmedBy?: string;
}

/** Ngữ cảnh action hệ thống của billing (không khoá idempotency — mỗi action tự idempotent theo biên nhận / `fulfilled_at`). */
export const billingCtx = (ws: string): ActionContext => ({ workspaceId: ws, source: 'system', actor: { type: 'system', id: BILLING_ACTOR }, authz: { isOwner: true } as never });

export class InvoiceFulfiller {
  private executor: Pick<ActionExecutor, 'execute'> | null = null;

  constructor(
    private readonly db: PlatformDb,
    private readonly wallet: WalletService,
    private readonly sink: BillingEventSink,
    private readonly now: () => Date,
  ) {}

  /** Executor nối lúc boot (ActionsModule global) — tránh vòng DI billing ↔ kernel actions. */
  useExecutor(e: Pick<ActionExecutor, 'execute'> | null): void {
    this.executor = e;
  }

  /** Chuyển `paid` nếu còn chờ (kể cả hết hạn — tiền về muộn vẫn nhận). true = lần này chuyển. */
  async markPaid(t: PlatformTx | PlatformDb, invoiceId: string, by: PaidBy): Promise<boolean> {
    const r = await t.billingInvoice.updateMany({
      where: { id: invoiceId, status: { in: [...PAYABLE] } },
      data: { status: 'paid', paidAt: this.now(), method: by.method, bankTxId: by.bankTxId ?? null, confirmedBy: by.confirmedBy ?? null },
    });
    return r.count === 1;
  }

  /** Ghi nhận hoá đơn đã `paid` chưa ghi nhận. Gọi lại an toàn. true = lần này ghi nhận. */
  async fulfil(invoiceId: string): Promise<boolean> {
    const inv = await this.db.billingInvoice.findUnique({ where: { id: invoiceId }, select: { id: true, workspaceId: true, status: true, fulfilledAt: true, holdReason: true } });
    if (!inv || inv.status !== 'paid' || inv.fulfilledAt || inv.holdReason) return false;
    if (this.executor) {
      // TIP-003c: action riêng tiền nhiệm 039 theo hoá đơn đã trả (nguồn bền); fulfilled_at / biên nhận ví là chống lặp.
      const t = domainTrigger({ workspaceId: inv.workspaceId, actionId: 'billing.apply_invoice', actor: BILLING_ACTOR, sourceKind: 'accepted_operation', sourceRef: `billing_invoice:${inv.id}`, targetId: inv.id, input: { invoice_id: inv.id } });
      const out = (await runSystemAction(this.executor, null, t, billingCtx(inv.workspaceId))) as { status: number; data: { result?: { status?: string } } };
      return out.status === 200 && out.data.result?.status === 'applied';
    }
    const r = await this.db.$transaction((t) => applyPaidInvoice(t, this.wallet, inv.id, this.now()));
    for (const c of r.changes) await this.wallet.emit(c);
    await this.sink.emit(inv.workspaceId, r.events);
    return r.status === 'applied';
  }

  /** Scheduler: hoá đơn `paid` chưa ghi nhận, không bị giữ đối soát → ghi nhận (index billing_invoice_paid_unfulfilled_idx). */
  async fulfilPending(limit = 50): Promise<number> {
    const rows = await this.db.billingInvoice.findMany({ where: { status: 'paid', fulfilledAt: null, holdReason: null }, orderBy: [{ paidAt: 'asc' }, { id: 'asc' }], select: { id: true }, take: limit });
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
