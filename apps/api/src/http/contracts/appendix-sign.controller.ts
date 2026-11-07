// Phụ lục hợp đồng (TIP-030b F3 spec 15, 17): nội bộ `GET /v1/contracts/:id/appendices` (tab Phụ lục, quyền `contract.view` / `contract.draft`,
// scope hợp đồng cha) + `GET /v1/contracts/:id/appendices/:aid/pdf`; công khai `/v1/public/appendix-sign/:token` (GET xem — không ghi,
// POST open / otp / sign / decline, GET pdf). Controller công khai chỉ chuyển token + IP / UA — không nhận actor / workspace / phụ lục;
// ghi đi qua AppendixPublicService → ActionExecutor (capability niêm phong). Ghi nội bộ qua action `contract.appendix_*`.
import { Body, Controller, Get, HttpCode, Inject, Param, Post, Req, Res } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { AppendixPublicService, AppendixReadService, type AppendixSignClient } from '@appchat/core';
import { AppError } from '@appchat/shared';
import { clientIp } from '../identity/http-util';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';
import { sendPdf } from '../sales/quotes.controller';

const clientOf = (req: IncomingMessage): AppendixSignClient => {
  const ua = req.headers['user-agent'];
  return { ip: clientIp(req) ?? null, userAgent: (Array.isArray(ua) ? ua[0] : ua)?.slice(0, 300) ?? null };
};
const obj = (b: unknown) => (b && typeof b === 'object' ? (b as Record<string, unknown>) : {});
const ready = <T>(s: T | null): T => {
  if (!s) throw new AppError('NOT_IMPLEMENTED', 501, { appendix: 'unavailable' });
  return s;
};

@Controller('contracts/:id/appendices')
export class ContractAppendicesController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(AppendixReadService) private readonly read: AppendixReadService | null,
  ) {}

  private async viewer(req: IncomingMessage) {
    const a = await this.actors.resolve(req);
    const p = a.authz.permissions;
    if (!a.authz.isOwner && !p.has('contract.view') && !p.has('contract.draft')) throw new AppError('FORBIDDEN', 403, { permission: 'contract.view' });
    return a;
  }

  @Get()
  async list(@Req() req: IncomingMessage, @Param('id') id: string) {
    return { data: await ready(this.read).list(await this.viewer(req), id) };
  }

  @Get(':aid/pdf')
  async pdf(@Req() req: IncomingMessage, @Param('id') id: string, @Param('aid') aid: string, @Res() res: ServerResponse) {
    const r = await ready(this.read).pdf(await this.viewer(req), id, aid);
    sendPdf(res, r.name, r.pdf, 'inline');
  }
}

@Controller('public/appendix-sign')
export class PublicAppendixSignController {
  constructor(@Inject(AppendixPublicService) private readonly sign: AppendixPublicService | null) {}

  @Get(':token')
  async get(@Param('token') token: string, @Req() req: IncomingMessage) {
    return { data: await ready(this.sign).open(token, clientOf(req), false) };
  }

  @Post(':token/open')
  @HttpCode(200)
  async open(@Param('token') token: string, @Req() req: IncomingMessage) {
    return { data: await ready(this.sign).open(token, clientOf(req)) };
  }

  @Post(':token/otp')
  @HttpCode(200)
  async otp(@Param('token') token: string, @Req() req: IncomingMessage) {
    return { data: await ready(this.sign).otp(token, clientOf(req)) };
  }

  @Post(':token/sign')
  @HttpCode(200)
  async doSign(@Param('token') token: string, @Req() req: IncomingMessage, @Body() body: unknown) {
    return { data: await ready(this.sign).sign(token, clientOf(req), obj(body)) };
  }

  @Post(':token/decline')
  @HttpCode(200)
  async decline(@Param('token') token: string, @Req() req: IncomingMessage, @Body() body: unknown) {
    const r = obj(body).reason;
    return { data: await ready(this.sign).decline(token, clientOf(req), typeof r === 'string' ? r : undefined) };
  }

  @Get(':token/pdf')
  async pdf(@Param('token') token: string, @Req() req: IncomingMessage, @Res() res: ServerResponse) {
    const r = await ready(this.sign).pdf(token, clientOf(req));
    sendPdf(res, r.name, r.pdf, 'attachment');
  }
}
