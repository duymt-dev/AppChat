// Hoá đơn gói AppChat (Blueprint §2.2 `billing_invoice`, REQ-L04, COMMERCE §10 — TIP-010): tạo (VietQR động 15 phút về tài khoản
// nền tảng), huỷ, "Tôi đã chuyển khoản" (→ pending_review), danh sách cho Cài đặt › Gói & thanh toán. Mọi ghi chạy trong PlatformTx
// của action. Mô tả dòng render theo locale người xem (i18n/server billing.invoice).
import {
  AppError,
  INVOICE_QR_TTL_MS,
  catalogItem,
  interpolate,
  invoiceCode,
  platformTransferCode,
  serverMessages,
  vietQrPayload,
  type BillInvoiceDto,
} from '@appchat/shared';
import type { PlatformDb } from '@appchat/db';
import type { PlatformTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';
import type { PaymentsEnv } from './payments.env';

type Kind = 'plan' | 'credit' | 'addon';
const DB_KIND = { plan: 'plan', credit: 'credits', addon: 'addon' } as const;
const UI_KIND = { plan: 'plan', credits: 'credit', addon: 'addon', upgrade_proration: 'plan' } as const;
const OPEN = ['pending', 'pending_review'] as const;

export interface CreateInvoiceInput {
  kind: Kind;
  item: string;
  period?: 'month' | 'year';
}

type Row = Awaited<ReturnType<PlatformDb['billingInvoice']['findFirstOrThrow']>>;

export class InvoicesService {
  constructor(
    private readonly db: PlatformDb,
    private readonly env: PaymentsEnv,
    private readonly now: () => Date,
  ) {}

  /** Giá + credit + khoá mô tả của mặt hàng; không mua được (Miễn phí / Liên hệ / không có) → 422. */
  private async price(tx: PlatformTx, i: CreateInvoiceInput) {
    if (i.kind !== 'plan') {
      const c = catalogItem(i.kind, i.item);
      if (!c) throw new AppError('VALIDATION_FAILED', 422, { item: 'not_purchasable' });
      return { amount: c.amount, credits: c.credits, planId: null, months: null };
    }
    const p = await tx.plan.findUnique({ where: { key: i.item } });
    const months = i.period === 'year' ? 12 : 1;
    const amount = months === 12 ? p?.priceYear : p?.priceMonth;
    if (!p || !p.active || p.isTrialPlan || !amount || amount <= 0n) throw new AppError('VALIDATION_FAILED', 422, { item: 'not_purchasable' });
    return { amount, credits: null, planId: p.id, months };
  }

  /** Preview mua (TIP-023b): giá + hoá đơn `pending` cùng mặt hàng còn hạn sẽ được dùng lại — chỉ đọc, không khoá / không sinh mã. */
  async quote(tx: Pick<PlatformTx, 'plan' | 'billingInvoice'>, workspaceId: string, i: CreateInvoiceInput) {
    const pr = await this.price(tx as PlatformTx, i);
    const open = await tx.billingInvoice.findFirst({
      where: { workspaceId, kind: DB_KIND[i.kind], item: i.item, months: pr.months, status: 'pending', expiresAt: { gt: this.now() } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, code: true },
    });
    return { ...pr, open };
  }

  /** Tạo hoá đơn — cùng mặt hàng còn hoá đơn `pending` chưa hết hạn → trả lại hoá đơn đó (bấm Mua hai lần không sinh hai QR). */
  async create(tx: PlatformTx, workspaceId: string, userId: string, i: CreateInvoiceInput): Promise<Row> {
    const now = this.now();
    await tx.$queryRaw`SELECT id FROM workspace WHERE id = ${workspaceId}::uuid FOR UPDATE`;
    const pr = await this.price(tx, i);
    const open = await tx.billingInvoice.findFirst({
      where: { workspaceId, kind: DB_KIND[i.kind], item: i.item, months: pr.months, status: 'pending', expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
    });
    if (open) return open;
    const [seq] = await tx.$queryRaw<{ n: bigint }[]>`SELECT nextval('billing_invoice_seq') AS n`;
    const code = invoiceCode(now.getUTCFullYear(), seq!.n);
    const transferCode = platformTransferCode(code);
    const [profile, ws] = await Promise.all([
      tx.businessProfile.findUnique({ where: { workspaceId } }),
      tx.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { settings: true, ownerUserId: true } }),
    ]);
    const owner = await tx.user.findUnique({ where: { id: ws.ownerUserId }, select: { email: true } });
    const general = ((ws.settings ?? {}) as { general?: { admin_email?: string } }).general;
    return tx.billingInvoice.create({
      data: {
        id: uuidv7(now.getTime()),
        workspaceId,
        code,
        kind: DB_KIND[i.kind],
        item: i.item,
        planId: pr.planId,
        months: pr.months,
        credits: pr.credits === null ? null : BigInt(pr.credits),
        amount: pr.amount,
        // Thông tin xuất hoá đơn VAT chụp lúc tạo (COMMERCE §10) — đội vận hành xuất tay tới khi có e-invoice (Q2).
        vatInfo: { tax_code: profile?.taxCode ?? '', legal_name: profile?.legalName ?? '', address: profile?.address ?? '', email: general?.admin_email ?? owner?.email ?? '' },
        transferCode,
        qrPayload: vietQrPayload({ bin: this.env.PLATFORM_BANK_BIN, account_no: this.env.PLATFORM_BANK_ACCOUNT_NO, amount: String(pr.amount), content: transferCode }),
        expiresAt: new Date(now.getTime() + INVOICE_QR_TTL_MS),
        createdByUserId: userId,
      },
    });
  }

  private async open(tx: PlatformTx, workspaceId: string, id: string) {
    const inv = await tx.billingInvoice.findFirst({ where: { id, workspaceId } });
    if (!inv) throw new AppError('NOT_FOUND', 404, { invoice_id: 'not_found' });
    return inv;
  }

  async cancel(tx: PlatformTx, workspaceId: string, id: string): Promise<Row> {
    const inv = await this.open(tx, workspaceId, id);
    const r = await tx.billingInvoice.updateMany({ where: { id: inv.id, status: { in: [...OPEN] } }, data: { status: 'cancelled' } });
    if (!r.count) throw new AppError('CONFLICT', 409, { status: inv.status });
    return inv;
  }

  /** "Tôi đã chuyển khoản": pending (kể cả QR vừa hết hạn) → pending_review chờ đối soát / admin; đã paid → giữ (idempotent). */
  async report(tx: PlatformTx, workspaceId: string, id: string): Promise<{ before: string; status: string }> {
    const inv = await this.open(tx, workspaceId, id);
    if (inv.status === 'paid' || inv.status === 'pending_review') return { before: inv.status, status: inv.status };
    const r = await tx.billingInvoice.updateMany({
      where: { id: inv.id, status: { in: ['pending', 'expired'] } },
      data: { status: 'pending_review', reportedAt: this.now() },
    });
    if (!r.count) throw new AppError('CONFLICT', 409, { status: inv.status });
    return { before: inv.status, status: 'pending_review' };
  }

  /** Một hoá đơn (QR, trạng thái) — `GET /v1/billing/invoices/:id`; không thuộc workspace → 404. */
  async get(workspaceId: string, locale: string, id: string): Promise<BillInvoiceDto> {
    const row = await this.db.billingInvoice.findFirst({ where: { id, workspaceId } });
    if (!row) throw new AppError('NOT_FOUND', 404, { invoice_id: 'not_found' });
    return (await this.view([row], locale))[0]!;
  }

  async list(workspaceId: string, locale: string, p: { status?: string; q?: string }): Promise<{ data: BillInvoiceDto[]; next_cursor: null }> {
    const status = p.status && p.status !== 'all' ? p.status : undefined;
    const rows = await this.db.billingInvoice.findMany({
      where: { workspaceId, ...(status ? { status: status as Row['status'] } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const q = (p.q ?? '').trim().toLowerCase();
    const data = (await this.view(rows, locale)).filter((r) => !q || r.code.toLowerCase().includes(q) || r.desc.toLowerCase().includes(q));
    return { data, next_cursor: null };
  }

  private async view(rows: Row[], locale: string): Promise<BillInvoiceDto[]> {
    const plans = new Map((await this.db.plan.findMany({ where: { id: { in: rows.map((r) => r.planId).filter((x): x is string => !!x) } } })).map((x) => [x.id, x.name]));
    const m = serverMessages(locale).billing.invoice as Record<string, string>;
    const desc = (r: Row) => {
      if (r.kind === 'credits') return interpolate(m.credits!, { credits: Number(r.credits ?? 0n).toLocaleString(locale === 'en' ? 'en-US' : 'vi-VN') });
      if (r.kind === 'addon') return m[r.item] ?? r.item;
      return interpolate(r.months === 12 ? m.plan_year! : m.plan_month!, { plan: plans.get(r.planId ?? '') ?? r.item });
    };
    return rows.map((r) => ({
        id: r.id,
        code: r.code,
        desc: desc(r),
        date: r.createdAt.toISOString().slice(0, 10),
        amount: String(r.amount),
        method: r.method,
        status: r.status,
        kind: UI_KIND[r.kind],
        item: r.item,
        ...(r.status === 'pending'
          ? {
              qr: {
                payload: r.qrPayload,
                amount: String(r.amount),
                content: r.transferCode,
                expires_at: r.expiresAt.toISOString(),
                bank: this.env.PLATFORM_BANK_NAME,
                account_no: this.env.PLATFORM_BANK_ACCOUNT_NO,
                account_name: this.env.PLATFORM_BANK_ACCOUNT_NAME,
              },
            }
          : {}),
    }));
  }
}
