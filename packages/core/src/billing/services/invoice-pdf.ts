// PDF đề nghị thanh toán gói AppChat (TIP-039 AC08, COMMERCE Q2): `GET /v1/billing/invoices/:id/pdf` — chứng từ NỀN TẢNG, không phải hoá
// đơn GTGT (luôn có dòng "không thay thế hoá đơn GTGT"; hoá đơn VAT do đội vận hành xuất tay theo `vat_info`). Đọc đúng ảnh chụp lúc tạo
// (số tiền, mô tả, thông tin xuất hoá đơn, kỳ trong `snapshot`) + trạng thái / ngày trả hiện tại — không đọc lại giá gói. Hoá đơn của
// workspace khác → 404 (InvoicesService.get lọc theo workspace). Render HTML → PDF qua DocRenderer (LibreOffice, như chứng từ khác — DV-036,
// không thêm React-PDF); không lưu tệp, không link công khai.
import { AppError, createFmt, htmlPage, interpolate, serverMessages } from '@appchat/shared';
import type { PlatformDb } from '@appchat/db';
import type { PaymentsEnv } from '../payments/payments.env';
import type { InvoicesService } from '../payments/invoices.service';
import { snapshotOf } from '../lifecycle/types';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

type Vat = { tax_code?: string; legal_name?: string; address?: string; email?: string };

export interface InvoiceDoc {
  code: string;
  html: string;
}

/** HTML đề nghị thanh toán của một hoá đơn (đã kiểm workspace). */
export async function invoiceDocument(
  db: Pick<PlatformDb, 'billingInvoice' | 'workspace'>,
  invoices: Pick<InvoicesService, 'get'>,
  env: Pick<PaymentsEnv, 'PLATFORM_BANK_NAME' | 'PLATFORM_BANK_ACCOUNT_NO' | 'PLATFORM_BANK_ACCOUNT_NAME'>,
  workspaceId: string,
  locale: string,
  id: string,
): Promise<InvoiceDoc> {
  const dto = await invoices.get(workspaceId, locale, id);
  const row = await db.billingInvoice.findFirstOrThrow({ where: { id, workspaceId } });
  const ws = await db.workspace.findUnique({ where: { id: workspaceId }, select: { timezone: true } });
  const fmt = createFmt({ locale, timeZone: ws?.timezone ?? undefined });
  const m = serverMessages(locale).billing.pdf;
  const notVat = serverMessages(locale).documents.notVat;
  const vat = (row.vatInfo ?? {}) as Vat;
  const snap = snapshotOf(row.snapshot);
  const day = (iso: string | Date) => fmt.date(iso);
  const period = !snap
    ? ''
    : snap.mode === 'upgrade'
      ? `${day(snap.term_start)} – ${day(snap.term_end)}`
      : snap.mode === 'addon'
        ? snap.ends_at
          ? `→ ${day(snap.ends_at)}`
          : ''
        : snap.starts_at
          ? `${day(snap.starts_at)} · ${snap.months}M`
          : `${snap.months}M`;
  const desc = snap?.mode === 'upgrade' ? interpolate(m.upgrade, { from: snap.from_plan_key, to: snap.plan_key }) : dto.desc;
  const row2 = (k: string, v: string) => `<tr><th style="width:32%;text-align:left">${esc(k)}</th><td>${esc(v || '—')}</td></tr>`;
  const inner =
    `<h1>${esc(m.title)}</h1>` +
    `<table>${row2(m.code, row.code)}${row2(m.created, `${fmt.date(row.createdAt)} ${fmt.time(row.createdAt)}`)}` +
    `${row2(m.status, m.st[row.status])}${row.paidAt ? row2(m.paidAt, `${fmt.date(row.paidAt)} ${fmt.time(row.paidAt)}`) : ''}</table>` +
    `<h3>${esc(m.seller)}</h3><table>${row2(m.seller, env.PLATFORM_BANK_ACCOUNT_NAME)}` +
    `${row2(m.bank, `${env.PLATFORM_BANK_NAME} · ${env.PLATFORM_BANK_ACCOUNT_NO}`)}${row2(m.transfer, row.transferCode)}</table>` +
    `<h3>${esc(m.buyer)}</h3><table>${row2(m.buyer, vat.legal_name ?? '')}${row2(m.taxCode, vat.tax_code ?? '')}` +
    `${row2(m.address, vat.address ?? '')}${row2(m.email, vat.email ?? '')}</table>` +
    `<table><tr><th style="text-align:left">${esc(m.item)}</th><th style="text-align:left">${esc(m.period)}</th>` +
    `<th style="text-align:right">${esc(m.amount)}</th></tr>` +
    `<tr><td>${esc(desc)}</td><td>${esc(period || '—')}</td><td style="text-align:right">${esc(fmt.money(String(row.amount)))}</td></tr>` +
    `<tr><th colspan="2" style="text-align:right">${esc(m.total)}</th><th style="text-align:right">${esc(fmt.money(String(row.amount)))}</th></tr></table>` +
    `<p><b>${esc(notVat)}</b></p><p><small>${esc(m.vatManual)}</small></p>`;
  return { code: row.code, html: htmlPage(`${row.code} — ${m.title}`, inner) };
}

/** Hoá đơn → PDF. Thiếu bộ render (DocRenderer / LibreOffice) → 501 `render_unavailable`, không trả tệp rỗng. */
export class BillingInvoicePdf {
  constructor(
    private readonly db: Pick<PlatformDb, 'billingInvoice' | 'workspace'>,
    private readonly invoices: Pick<InvoicesService, 'get'>,
    private readonly env: Pick<PaymentsEnv, 'PLATFORM_BANK_NAME' | 'PLATFORM_BANK_ACCOUNT_NO' | 'PLATFORM_BANK_ACCOUNT_NAME'>,
    private readonly render: { htmlPdf(html: string): Promise<Buffer> } | null,
  ) {}

  async pdf(workspaceId: string, locale: string, id: string): Promise<{ name: string; pdf: Buffer }> {
    const doc = await invoiceDocument(this.db, this.invoices, this.env, workspaceId, locale, id);
    if (!this.render) throw new AppError('NOT_IMPLEMENTED', 501, { render: 'render_unavailable' });
    return { name: `${doc.code}.pdf`, pdf: await this.render.htmlPdf(doc.html) };
  }
}
