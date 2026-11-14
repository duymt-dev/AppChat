// Đọc Báo giá (Blueprint §4.4 sales, TIP-029 — shape packages/shared/src/api/quotes.ts): /v1/quotes (D42 page + limit, `status` /
// `owner_id` (người tạo) / `assigned_user_id` (người phụ trách vận hành — TIP-015d) / `contact_id` / `returning` (old | new) / `q` không dấu / `cf.*`), /quotes/meta (?quote_id= kèm số liệu một báo giá),
// /quotes/:id, /quotes/:id/versions, /quotes/:id/pdf. Quyền `quote.view`; data scope sales trong service (không thấy → 404). Ghi qua
// action quote.*.
import { Controller, Get, Inject, Param, Query, Req, Res } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { QuotesReadService, type QuoteFilter } from '@appchat/core';
import { AppError } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

const int = (v: string | undefined, field: string) => {
  if (v === undefined || v === '') return undefined;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw new AppError('VALIDATION_FAILED', 400, { [field]: 'invalid' });
  return n;
};

export function quoteFilterOf(q: Record<string, string | undefined>): QuoteFilter {
  const custom = Object.fromEntries(Object.entries(q).filter(([k, x]) => k.startsWith('cf.') && x).map(([k, x]) => [k.slice(3), String(x).slice(0, 100)]));
  return { status: q.status, ownerId: q.owner_id, assignedId: q.assigned_user_id, contactId: q.contact_id, returning: q.returning, q: q.q?.slice(0, 100), custom };
}

export function sendPdf(res: ServerResponse, name: string, pdf: Buffer, disposition: 'inline' | 'attachment') {
  res.setHeader('content-type', 'application/pdf');
  res.setHeader('content-disposition', `${disposition}; filename*=UTF-8''${encodeURIComponent(name)}`);
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('cache-control', 'no-store');
  res.end(pdf);
}

@Controller('quotes')
export class QuotesController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(QuotesReadService) private readonly read: QuotesReadService,
  ) {}

  private async viewer(req: IncomingMessage) {
    const a = await this.actors.resolve(req);
    if (!a.authz.isOwner && !a.authz.permissions.has('quote.view')) throw new AppError('FORBIDDEN', 403, { permission: 'quote.view' });
    return a;
  }

  @Get()
  async list(@Req() req: IncomingMessage, @Query() q: Record<string, string | undefined>) {
    return this.read.list(await this.viewer(req), quoteFilterOf(q), int(q.page, 'page'), int(q.limit, 'limit'));
  }

  @Get('meta')
  async meta(@Req() req: IncomingMessage, @Query('quote_id') quoteId?: string) {
    return { data: await this.read.meta(await this.viewer(req), quoteId || undefined) };
  }

  @Get(':id')
  async get(@Req() req: IncomingMessage, @Param('id') id: string) {
    return { data: await this.read.get(await this.viewer(req), id) };
  }

  @Get(':id/versions')
  async versions(@Req() req: IncomingMessage, @Param('id') id: string) {
    return { data: await this.read.versions(await this.viewer(req), id) };
  }

  @Get(':id/pdf')
  async pdf(@Req() req: IncomingMessage, @Param('id') id: string, @Res() res: ServerResponse) {
    const r = await this.read.pdf(await this.viewer(req), id);
    sendPdf(res, r.name, r.pdf, 'inline');
  }
}
