// GET /v1/billing/summary · /plans · /wallet · /ledger?cursor=&kind=&dir=&source=&from=&to= (Blueprint §4.4 billing) — thành viên workspace (X-Workspace-Id);
// TIP-010: /invoices?status=&q=, /invoices/:id (`billing.manage`); TIP-039: /invoices/:id/pdf (đề nghị thanh toán, không phải hoá đơn GTGT),
// /quote?kind=&item=&period= (giá server tính trước khi mua — billing.manage). Ghi là action billing.* (TIP-010 / 039). Chữ render theo locale người xem.
import { Controller, Get, Inject, Param, Query, Req, Res } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { BillingInvoicePdf, BillingReadService, InvoicesService, PLATFORM_DB, parseLedgerFilter, parseQuoteInput, quoteView } from '@appchat/core';
import type { PlatformDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Controller('billing')
export class BillingController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(BillingReadService) private readonly read: BillingReadService,
    @Inject(PLATFORM_DB) private readonly platform: PlatformDb,
    @Inject(InvoicesService) private readonly invoices: InvoicesService,
    @Inject(BillingInvoicePdf) private readonly pdfs: BillingInvoicePdf,
  ) {}

  private async locale(userId: string) {
    return (await this.platform.user.findUnique({ where: { id: userId }, select: { locale: true } }))?.locale ?? 'vi';
  }

  @Get('summary')
  async summary(@Req() req: IncomingMessage) {
    const a = await this.actors.resolve(req);
    return { data: await this.read.summary(a.workspaceId) };
  }

  @Get('plans')
  async plans(@Req() req: IncomingMessage) {
    await this.actors.resolve(req);
    return { data: await this.read.catalog() };
  }

  @Get('wallet')
  async wallet(@Req() req: IncomingMessage) {
    const a = await this.actors.resolve(req);
    return { data: await this.read.wallet(a.workspaceId, await this.locale(a.userId)) };
  }

  @Get('ledger')
  async ledger(
    @Req() req: IncomingMessage,
    @Query() q: { cursor?: string; limit?: string; kind?: string; dir?: string; source?: string; from?: string; to?: string },
  ) {
    const a = await this.actors.resolve(req);
    const n = q.limit === undefined ? undefined : Number(q.limit);
    if (n !== undefined && !Number.isInteger(n)) throw new AppError('VALIDATION_FAILED', 400, { limit: 'invalid' });
    // TIP-039: lọc server-side (loại / vào-ra / nguồn / khoảng ngày) trước LIMIT.
    const tz = (await this.platform.workspace.findUnique({ where: { id: a.workspaceId }, select: { timezone: true } }))?.timezone ?? undefined;
    return this.read.ledger(a.workspaceId, await this.locale(a.userId), q.cursor || undefined, n, parseLedgerFilter(q, tz));
  }

  private async manager(req: IncomingMessage) {
    const a = await this.actors.resolve(req);
    if (!a.authz.isOwner && !a.authz.permissions.has('billing.manage')) throw new AppError('FORBIDDEN', 403, { permission: 'billing.manage' });
    return a;
  }

  @Get('quote')
  async quote(@Req() req: IncomingMessage, @Query() q: { kind?: string; item?: string; period?: string }) {
    const a = await this.manager(req);
    return { data: await quoteView(this.platform, this.invoices, a.workspaceId, parseQuoteInput(q)) };
  }

  @Get('invoices')
  async list(@Req() req: IncomingMessage, @Query('status') status?: string, @Query('q') q?: string) {
    const a = await this.manager(req);
    return this.invoices.list(a.workspaceId, await this.locale(a.userId), { status, q: q?.slice(0, 100) });
  }

  @Get('invoices/:id')
  async one(@Req() req: IncomingMessage, @Param('id') id: string) {
    const a = await this.manager(req);
    if (!UUID.test(id)) throw new AppError('NOT_FOUND', 404, { invoice_id: 'not_found' });
    return { data: await this.invoices.get(a.workspaceId, await this.locale(a.userId), id) };
  }

  /** Tải PDF — billing.manage + cùng workspace (khác → 404); private, không lưu cache dùng chung. */
  @Get('invoices/:id/pdf')
  async pdf(@Req() req: IncomingMessage, @Param('id') id: string, @Res() res: ServerResponse) {
    const a = await this.manager(req);
    if (!UUID.test(id)) throw new AppError('NOT_FOUND', 404, { invoice_id: 'not_found' });
    const r = await this.pdfs.pdf(a.workspaceId, await this.locale(a.userId), id);
    res.setHeader('content-type', 'application/pdf');
    res.setHeader('content-disposition', `attachment; filename*=UTF-8''${encodeURIComponent(r.name)}`);
    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('cache-control', 'private, no-store');
    res.end(r.pdf);
  }
}
