// admin.bank_transaction.match (TIP-040 pha 3, AC06, DC-372): admin gắn MỘT giao dịch ngân hàng chưa khớp vào MỘT hoá đơn còn chờ
// (khách ghi sai mã chuyển khoản…). Khoá dòng giao dịch rồi hoá đơn (FOR UPDATE, thứ tự cố định); kiểm: tiền VÀO, đúng tài khoản nền
// tảng, giao dịch chưa gắn hoá đơn nào, hoá đơn chưa có giao dịch, số tiền BẰNG đúng hoá đơn. Thừa / thiếu tiền → 422 (không tự cộng
// dồn / tách / hoàn — chưa có luật tiền cho khoản lệch, giữ chưa khớp). Ghi nhận (gói / credit) sau commit bằng InvoiceFulfiller 039
// (idempotent + scheduler quét lại).
import { Inject, Injectable } from '@nestjs/common';
import type { PlatformDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { ActionInput, adminBankTransactionMatch } from '@appchat/actions';
import type { PlatformTx } from '../../kernel/actions/action-context';
import { ActionHandler } from '../../kernel/actions/handler';
import { PlatformActionHandler, type AdminOutcome, type PlatformContext } from '../../kernel/actions/platform-context';
import { InvoiceFulfiller, PAYMENTS_ENV, type PaymentsEnv } from '../../billing/public';

type Input = ActionInput<typeof adminBankTransactionMatch>;
type Output = { invoice_id: string; bank_transaction_id: string; status: 'paid' };
const PAYABLE = ['pending', 'pending_review', 'expired'];
const digits = (s: string) => s.replace(/\D/g, '');

type Tx = { id: string; amount: bigint; direction: string; accountNo: string; matchedInvoiceId: string | null; provider: string; occurredAt: Date };
type Inv = { id: string; code: string; workspaceId: string; amount: bigint; status: string; bankTxId: string | null };

/** Kiểm chung execute / preview — trả lý do lỗi (fields) hoặc null. */
function mismatch(t: Tx | null, inv: Inv | null, account: string): [number, Record<string, string>] | null {
  if (!t) return [404, { bank_transaction_id: 'not_found' }];
  if (!inv) return [404, { invoice_id: 'not_found' }];
  if (t.matchedInvoiceId) return [409, { bank_transaction_id: 'already_matched' }];
  if (t.direction !== 'in' || digits(t.accountNo) !== account) return [422, { bank_transaction_id: 'not_platform_income' }];
  if (!PAYABLE.includes(inv.status) || inv.bankTxId) return [409, { invoice_id: inv.status }];
  if (t.amount > inv.amount) return [422, { amount: 'overpaid' }];
  if (t.amount < inv.amount) return [422, { amount: 'underpaid' }];
  return null;
}

const fail = ([status, fields]: [number, Record<string, string>]) =>
  new AppError(status === 404 ? 'NOT_FOUND' : status === 409 ? 'CONFLICT' : 'VALIDATION_FAILED', status, fields);

@Injectable()
@ActionHandler('admin.bank_transaction.match')
export class AdminBankTransactionMatchHandler extends PlatformActionHandler<Input, Output> {
  constructor(
    @Inject(InvoiceFulfiller) private readonly fulfiller: InvoiceFulfiller | null,
    @Inject(PAYMENTS_ENV) private readonly env: PaymentsEnv,
  ) {
    super();
  }

  async executePlatform(ctx: PlatformContext, i: Input, ptx: PlatformTx): Promise<AdminOutcome<Output>> {
    if (!this.fulfiller) throw new AppError('INTERNAL', 500, undefined, 'admin.bank_transaction.match cần InvoiceFulfiller');
    // Thứ tự khoá cố định: giao dịch → hoá đơn (webhook khớp tự động cùng lúc chỉ khoá hoá đơn qua UPDATE … WHERE status).
    const [t] = await ptx.$queryRaw<Tx[]>`SELECT id, amount, direction, account_no AS "accountNo", matched_invoice_id AS "matchedInvoiceId", provider, occurred_at AS "occurredAt" FROM bank_transaction WHERE id = ${i.bank_transaction_id}::uuid FOR UPDATE`;
    const [inv] = await ptx.$queryRaw<Inv[]>`SELECT id, code, workspace_id AS "workspaceId", amount, status::text AS status, bank_tx_id AS "bankTxId" FROM billing_invoice WHERE id = ${i.invoice_id}::uuid FOR UPDATE`;
    const bad = mismatch(t ?? null, inv ?? null, digits(this.env.PLATFORM_BANK_ACCOUNT_NO));
    if (bad) throw fail(bad);
    if (!(await this.fulfiller.markPaid(ptx, inv!.id, { method: 'bank_transfer', bankTxId: t!.id, confirmedBy: ctx.actor.id }))) throw new AppError('CONFLICT', 409, { invoice_id: inv!.status });
    const n = await ptx.bankTransaction.updateMany({ where: { id: t!.id, matchedInvoiceId: null }, data: { matchedInvoiceId: inv!.id } });
    if (!n.count) throw new AppError('CONFLICT', 409, { bank_transaction_id: 'already_matched' });
    const fulfiller = this.fulfiller;
    return {
      result: { invoice_id: inv!.id, bank_transaction_id: t!.id, status: 'paid' },
      targetWorkspaceId: inv!.workspaceId,
      before: { invoice: { id: inv!.id, code: inv!.code, status: inv!.status }, bank_transaction: { id: t!.id, provider: t!.provider, amount: String(t!.amount), matched_invoice_id: null } },
      after: { invoice: { id: inv!.id, status: 'paid' }, bank_transaction: { id: t!.id, matched_invoice_id: inv!.id }, reason: i.reason },
      afterCommit: async () => void (await fulfiller.fulfil(inv!.id)),
    };
  }

  async previewPlatform(_ctx: PlatformContext, i: Input, db: PlatformDb) {
    const t = await db.bankTransaction.findUnique({ where: { id: i.bank_transaction_id } });
    const inv = await db.billingInvoice.findUnique({ where: { id: i.invoice_id } });
    const bad = mismatch(t, inv, digits(this.env.PLATFORM_BANK_ACCOUNT_NO));
    if (bad) throw fail(bad);
    const ws = await db.workspace.findUnique({ where: { id: inv!.workspaceId }, select: { name: true } });
    return {
      summary: `${inv!.code} · ${ws?.name ?? ''} · ${String(inv!.amount)}`,
      risk: 'money' as const,
      changes: [
        { entity: 'billing_invoice', id: inv!.id, before: { status: inv!.status }, after: { status: 'paid' } },
        { entity: 'bank_transaction', id: t!.id, before: { matched_invoice_id: null }, after: { matched_invoice_id: inv!.id } },
      ],
      warnings: [inv!.kind === 'credits' ? 'credits_added' : 'plan_activated'],
    };
  }
}
