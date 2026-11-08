// Đọc Đề nghị thanh toán (Blueprint §4.4 sales, TIP-032 — shape packages/shared/src/api/invoices.ts): /v1/invoices (D42 page + limit,
// `status` / `contact_id` / `order_id` / `owner_id` / `q` không dấu), /invoices/meta (?invoice_id=), /invoices/:id, /invoices/:id/pdf,
// /invoices/:id/qr (ảnh VietQR — TIP-032b), /invoices/receipts/:paymentId/pdf (phiếu thu), /contacts/:id/packages (liệu trình), /settings/payments (`finance.manage`). Quyền
// `invoice.manage` (hoặc `payment.record` — kế toán); data scope sales trong service (không thấy → 404). Ghi qua action invoice.* / payment.*.
import { Controller, Get, Inject, Param, Query, Req, Res } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { InvoicesReadService, type InvoiceFilter } from '@appchat/core';
import { AppError } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';
import { sendPdf } from './quotes.controller';

const int = (v: string | undefined, field: string) => {
  if (v === undefined || v === '') return undefined;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw new AppError('VALIDATION_FAILED', 400, { [field]: 'invalid' });
  return n;
};

export const invoiceFilterOf = (q: Record<string, string | undefined>): InvoiceFilter => ({ status: q.status, contactId: q.contact_id, orderId: q.order_id, ownerId: q.owner_id, q: q.q?.slice(0, 100) });

@Controller()
export class InvoicesController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(InvoicesReadService) private readonly read: InvoicesReadService,
  ) {}

  private async viewer(req: IncomingMessage, perms: string[] = ['invoice.manage', 'payment.record']) {
    const a = await this.actors.resolve(req);
    if (!a.authz.isOwner && !perms.some((p) => a.authz.permissions.has(p as never))) throw new AppError('FORBIDDEN', 403, { permission: perms[0]! });
    return a;
  }

  @Get('invoices')
  async list(@Req() req: IncomingMessage, @Query() q: Record<string, string | undefined>) {
    return this.read.list(await this.viewer(req), invoiceFilterOf(q), int(q.page, 'page'), int(q.limit, 'limit'));
  }

  @Get('invoices/meta')
  async meta(@Req() req: IncomingMessage, @Query('invoice_id') invoiceId?: string) {
    return { data: await this.read.meta(await this.viewer(req), invoiceId || undefined) };
  }

  @Get('invoices/receipts/:paymentId/pdf')
  async receipt(@Req() req: IncomingMessage, @Param('paymentId') paymentId: string, @Res() res: ServerResponse) {
    const r = await this.read.receipt(await this.viewer(req), paymentId);
    sendPdf(res, r.name, r.pdf, 'inline');
  }

  @Get('invoices/:id')
  async get(@Req() req: IncomingMessage, @Param('id') id: string) {
    return { data: await this.read.get(await this.viewer(req), id) };
  }

  /** Ảnh VietQR của số còn phải thu (TIP-032b P2) — quyền xem đề nghị (scope), không cache vì chứa số tiền / tài khoản riêng. */
  @Get('invoices/:id/qr')
  async qr(@Req() req: IncomingMessage, @Param('id') id: string, @Res() res: ServerResponse) {
    const png = await this.read.qr(await this.viewer(req), id);
    res.setHeader('content-type', 'image/png');
    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('cache-control', 'no-store');
    res.end(png);
  }

  @Get('invoices/:id/pdf')
  async pdf(@Req() req: IncomingMessage, @Param('id') id: string, @Res() res: ServerResponse) {
    const r = await this.read.pdf(await this.viewer(req), id);
    sendPdf(res, r.name, r.pdf, 'inline');
  }

  // TIP-033b §1.3: cùng PackagesRead với action package.list_for_contact — { data, next_cursor }, crm.view (không đổi sang package.manage).
  @Get('contacts/:id/packages')
  async packages(@Req() req: IncomingMessage, @Param('id') id: string, @Query() q: Record<string, string | undefined>) {
    const limit = q.limit ? Number(q.limit) : undefined;
    const r = await this.read.packages(await this.viewer(req, ['crm.view']), { contactId: id, status: q.status || undefined, serviceId: q.service_id || undefined, cursor: q.cursor || undefined, limit: Number.isFinite(limit) ? limit : undefined });
    return { data: r.packages, next_cursor: r.next_cursor };
  }

  @Get('settings/payments')
  async settings(@Req() req: IncomingMessage) {
    return { data: await this.read.settings(await this.viewer(req, ['finance.manage'])) };
  }
}
