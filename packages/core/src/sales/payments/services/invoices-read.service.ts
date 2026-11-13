// Đọc Đề nghị thanh toán cho apps/api (Blueprint §4.4 sales — shape packages/shared/src/api/invoices.ts): danh sách D42 (page + limit,
// deferred join), chi tiết, meta (thẻ số liệu, hàng "Cần đối soát" khi có `payment.record`, hoàn tiền chờ duyệt khi có
// `payment.refund_approve`, tài khoản nhận; `invoice_id` → thẻ CRM + tệp của đề nghị đó), PDF đề nghị (bản đóng băng lúc gửi hoặc render),
// PDF phiếu thu (render lần đầu rồi giữ), cài đặt thanh toán, liệu trình của khách.
import { TenantContexts } from '@appchat/db';
import { AppError, interpolate, serverMessages, utcToWall, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import type { QuoteDeps } from '../../quotes/services/quote-deps';
import { UUID, visibleInvoice } from '../invoice-access';
import { invoiceStats, listInvoiceIds, type InvoiceFilter } from '../repos/invoices.repo';
import { webhookPathOf } from './bank-feed';
import { invoiceDocData, renderDocPdf } from './invoice-doc';
import { ensureReceiptPdf } from './receipt-file';
import { qrPng, readInvoiceQr } from './invoice-qr';
import { invoiceActorIds, paymentsByInvoice, toInvoiceRow, type InvoiceViewCtx } from './invoice-view';
import { customerDebt } from '../../../crm/insights/customer-debt';
import { listPackages, type PackageListInput } from '../packages/read.service';

export interface InvoiceViewer {
  workspaceId: string;
  userId: string;
  authz: AuthzContext;
}

const MAX_LIMIT = 100;
const can = (a: AuthzContext, p: string) => a.isOwner || a.permissions.has(p as never);
const accountView = (a: { bank: string; bankBin: string; accountNo: string; accountName: string } | null) =>
  a ? { bank: a.bank, bin: a.bankBin, account_no: a.accountNo, account_name: a.accountName } : null;

export class InvoicesReadService {
  constructor(
    private readonly d: QuoteDeps,
    private readonly now: () => Date,
  ) {}

  private async db(v: InvoiceViewer) {
    return this.d.need('tenants').get(TenantContexts.fromMembership(v.workspaceId, v.userId));
  }

  private async tx<T>(v: InvoiceViewer, fn: (tx: TenantTx) => Promise<T>): Promise<T> {
    return (await this.db(v)).$transaction(fn);
  }

  private async ctx(v: InvoiceViewer): Promise<Omit<InvoiceViewCtx, 'names'>> {
    return { ...(await this.d.viewerPlace(v.workspaceId, v.userId)), now: this.now() };
  }

  /** Bước 2 deferred join: đủ cột + khoản thu + khách + mã đơn cho đúng các id, giữ thứ tự bước 1. */
  private async rowsOf(tx: TenantTx, ids: string[], base: Omit<InvoiceViewCtx, 'names'>) {
    if (!ids.length) return [];
    const [rows, pays, account] = await Promise.all([tx.invoice.findMany({ where: { id: { in: ids } } }), paymentsByInvoice(tx, ids), tx.paymentAccount.findUnique({ where: { id: 1 } })]);
    const order = new Map(ids.map((id, i) => [id, i]));
    rows.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
    const orderIds = [...new Set(rows.map((r) => r.orderId).filter((x): x is string => !!x))];
    const [contacts, orders] = await Promise.all([
      tx.contact.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.contactId))] } }, select: { id: true, name: true, phone: true } }),
      orderIds.length ? tx.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, code: true } }) : [],
    ]);
    const cById = new Map(contacts.map((c) => [c.id, c]));
    const oById = new Map(orders.map((o) => [o.id, o.code]));
    const names = await this.d.members.names(invoiceActorIds(rows, pays.values()));
    const ctx: InvoiceViewCtx = { ...base, names };
    return rows.map((i) => toInvoiceRow(i, { pays: pays.get(i.id) ?? [], contact: cById.get(i.contactId), orderCode: i.orderId ? (oById.get(i.orderId) ?? '') : '', account }, ctx));
  }

  async list(v: InvoiceViewer, f: InvoiceFilter, page?: number, limit?: number) {
    const lim = Math.min(MAX_LIMIT, Math.max(1, limit ?? 20));
    const paged = page !== undefined;
    const pg = Math.max(1, page ?? 1);
    const base = await this.ctx(v);
    return this.tx(v, async (tx) => {
      const { ids, total } = await listInvoiceIds(tx, v.authz, f, paged ? { offset: (pg - 1) * lim, limit: lim } : null);
      const data = await this.rowsOf(tx, ids, base);
      const pages = Math.max(1, Math.ceil(total / lim));
      return { data, next_cursor: paged && pg < pages ? String(pg + 1) : null, meta: { total, page: paged ? pg : 1, limit: paged ? lim : data.length } };
    });
  }

  async get(v: InvoiceViewer, id: string) {
    const base = await this.ctx(v);
    return this.tx(v, async (tx) => (await this.rowsOf(tx, [(await visibleInvoice(tx, v.authz, id)).id], base))[0]!);
  }

  async meta(v: InvoiceViewer, invoiceId?: string) {
    return this.tx(v, async (tx) => {
      const [stats, account] = await Promise.all([invoiceStats(tx, v.authz), tx.paymentAccount.findUnique({ where: { id: 1 } })]);
      const bank = can(v.authz, 'payment.record')
        ? await tx.bankTx.findMany({ where: { status: 'needs_review' }, orderBy: { occurredAt: 'desc' }, take: 100, include: { feed: { select: { provider: true } } } })
        : [];
      const refunds = can(v.authz, 'payment.refund_approve') ? await this.pendingRefunds(tx) : [];
      const one = invoiceId && UUID.test(invoiceId) ? await visibleInvoice(tx, v.authz, invoiceId) : null;
      return {
        stats,
        bank_txs: bank.map((b) => ({ id: b.id, amount: String(b.amount), content: b.content, occurred_at: b.occurredAt.toISOString(), provider: b.feed.provider, reason: b.reason ?? 'missing_code', suggested_invoice_id: b.suggestedInvoiceId ?? '', status: b.status })),
        refunds,
        payment_account: accountView(account),
        ...(await this.oneMeta(tx, v.authz, one, utcToWall(this.now(), (await this.ctx(v)).timeZone).date)),
      };
    });
  }

  private async pendingRefunds(tx: TenantTx) {
    const rows = await tx.customerPayment.findMany({ where: { kind: 'refund', status: 'pending' }, orderBy: { createdAt: 'desc' }, take: 100 });
    const [contacts, invoices] = await Promise.all([
      tx.contact.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.contactId))] } }, select: { id: true, name: true } }),
      tx.invoice.findMany({ where: { id: { in: rows.map((r) => r.invoiceId).filter((x): x is string => !!x) } }, select: { id: true, code: true } }),
    ]);
    const names = await this.d.members.names(rows.map((r) => r.createdById));
    const c = new Map(contacts.map((x) => [x.id, x.name]));
    const i = new Map(invoices.map((x) => [x.id, x.code]));
    return rows.map((r) => ({ id: r.id, invoice_id: r.invoiceId, invoice_code: r.invoiceId ? (i.get(r.invoiceId) ?? '') : '', package_id: r.packageId, contact_name: c.get(r.contactId) ?? '', amount: String(-r.amount), reason: r.reason, by: r.createdById ? (names.get(r.createdById) ?? '') : 'system', at: r.createdAt.toISOString() }));
  }

  /** Thẻ CRM (số đề nghị của khách, tỉ lệ trả đúng hạn, công nợ theo khách — crm/insights/customer-debt) của đề nghị đang mở. Tệp (chứng từ
   *  đã sinh + tệp đính kèm, giữ đúng id tệp gốc) đọc qua `invoice.files_list` (TIP-032d). */
  private async oneMeta(tx: TenantTx, a: AuthzContext, one: Awaited<ReturnType<typeof visibleInvoice>> | null, today: string) {
    if (!one) return { crm: { total: 0, on_time: '0%' } };
    const all = await tx.invoice.findMany({ where: { contactId: one.contactId, status: { not: 'void' } }, select: { id: true, status: true, dueDate: true } });
    const paid = all.filter((x) => x.status === 'paid');
    const last = paid.length ? await tx.customerPayment.groupBy({ by: ['invoiceId'], where: { invoiceId: { in: paid.map((x) => x.id) }, kind: { not: 'refund' }, status: 'confirmed' }, _max: { paidAt: true } }) : [];
    const due = new Map(paid.map((x) => [x.id, x.dueDate.getTime() + 86_400_000]));
    const onTime = last.filter((l) => l._max.paidAt && l._max.paidAt.getTime() < due.get(l.invoiceId!)!).length;
    const debt = await customerDebt(tx, a, one.contactId, today);
    return { crm: { total: all.length, on_time: paid.length ? `${Math.round((onTime * 100) / paid.length)}%` : '0%', ...(debt ? { debt: debt.due, overdue: debt.overdue } : {}) } };
  }

  /** PDF đề nghị: bản đã gửi (đóng băng) hoặc render bản hiện tại. */
  async pdf(v: InvoiceViewer, id: string): Promise<{ name: string; pdf: Buffer }> {
    const db = await this.db(v);
    const i = await db.$transaction((tx) => visibleInvoice(tx, v.authz, id));
    const stored = i.fileId && this.d.files ? await this.d.files.read(db, i.fileId) : null;
    if (stored) return { name: stored.row.name, pdf: stored.body };
    const doc = await invoiceDocData(db, this.d.doc(), v.workspaceId, i);
    return { name: interpolate(serverMessages(doc.locale).sales.invoice.pdfName, { code: i.code }), pdf: await renderDocPdf(db, this.d.doc(), 'payment_request', doc.data, doc.locale) };
  }

  /** Ảnh VietQR (PNG) của số còn phải thu — chưa có tài khoản nhận / đã thu đủ / đã huỷ → 404 (TIP-032b P2). */
  async qr(v: InvoiceViewer, id: string): Promise<Buffer> {
    const db = await this.db(v);
    const i = await db.$transaction((tx) => visibleInvoice(tx, v.authz, id));
    const qr = i.status === 'void' ? null : await readInvoiceQr(db, i);
    if (!qr) throw new AppError('NOT_FOUND', 404, { qr: i.status === 'void' ? 'void' : 'unavailable' });
    return qrPng(qr.payload);
  }

  /** PDF phiếu thu của một khoản thu: lần đầu render + lưu (`receipt_file_id`), sau đó trả bản đã lưu. */
  async receipt(v: InvoiceViewer, paymentId: string): Promise<{ name: string; pdf: Buffer }> {
    const db = await this.db(v);
    const p = UUID.test(paymentId) ? await db.customerPayment.findUnique({ where: { id: paymentId } }) : null;
    if (!p || !p.invoiceId || !p.receiptCode) throw new AppError('NOT_FOUND', 404, { payment_id: 'not_found' });
    const i = await db.$transaction((tx) => visibleInvoice(tx, v.authz, p.invoiceId!));
    const r = await ensureReceiptPdf(db, this.d, v.workspaceId, i, p);
    return { name: r.name, pdf: r.pdf };
  }

  /** Cài đặt thanh toán (`finance.manage` — controller kiểm): tài khoản nhận + bank feed. */
  async settings(v: InvoiceViewer) {
    return this.tx(v, async (tx) => {
      const [account, feeds] = await Promise.all([tx.paymentAccount.findUnique({ where: { id: 1 } }), tx.tenantBankFeed.findMany({ where: { status: 'active' }, orderBy: { createdAt: 'asc' } })]);
      return {
        payment_account: accountView(account),
        bank_feeds: feeds.map((f) => ({ provider: f.provider, feed_id: f.id, account_no: f.accountNo, status: f.status, last_tx_at: f.lastTxAt?.toISOString() ?? '', webhook_path: webhookPathOf(f.provider, f.id) })),
      };
    });
  }

  /** Liệu trình của khách (TIP-033b) — PackagesRead dùng chung (packages/read.service.ts): khách ngoài scope CRM → 404, gói theo scope bán hàng. */
  async packages(v: InvoiceViewer, i: PackageListInput) {
    return this.tx(v, (tx) => listPackages(tx, v.authz, i));
  }
}
