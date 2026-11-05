// Đọc Khách thân thiết (TIP-036, Blueprint §4.4 loyalty — shape packages/shared/src/api/loyalty.ts): /v1/loyalty/config,
// /loyalty/members?tier=&q=&page=&limit= (D42), /loyalty/members/:contactId, /loyalty/members/:contactId/ledger?cursor=&limit=,
// /loyalty/lookup?phone=, /loyalty/overview (số thật theo scope), /loyalty/members/:contactId/files (+ /:fileId tải bytes — kiểm scope khách
// + liên kết trước Storage). Quyền `loyalty.view`; scope crm áp trong service (ngoài scope → 404 / lookup rỗng). Ghi qua action loyalty.*.
import { Controller, Get, Inject, Param, Query, Req, Res } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { MemberReadService } from '@appchat/core';
import { AppError } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

const int = (v: string | undefined, field: string, dflt: number) => {
  if (v === undefined || v === '') return dflt;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw new AppError('VALIDATION_FAILED', 400, { [field]: 'invalid' });
  return n;
};
const TIERS = new Set(['all', 'member', 'silver', 'gold', 'diamond']);

@Controller()
export class LoyaltyController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(MemberReadService) private readonly read: MemberReadService,
  ) {}

  private async viewer(req: IncomingMessage) {
    const a = await this.actors.resolve(req);
    if (!a.authz.isOwner && !a.authz.permissions.has('loyalty.view')) throw new AppError('FORBIDDEN', 403, { permission: 'loyalty.view' });
    return this.read.viewer(a);
  }

  @Get('loyalty/config')
  async config(@Req() req: IncomingMessage) {
    return { data: await this.read.config(await this.viewer(req)) };
  }

  @Get('loyalty/members')
  async members(@Req() req: IncomingMessage, @Query() q: Record<string, string | undefined>) {
    const tier = q.tier ?? 'all';
    if (!TIERS.has(tier)) throw new AppError('VALIDATION_FAILED', 400, { tier: 'invalid' });
    return this.read.members(await this.viewer(req), { tier, q: q.q?.slice(0, 100) }, int(q.page, 'page', 1), int(q.limit, 'limit', 20));
  }

  @Get('loyalty/overview')
  async overview(@Req() req: IncomingMessage) {
    return { data: await this.read.overview(await this.viewer(req)) };
  }

  @Get('loyalty/members/:id/files')
  async files(@Req() req: IncomingMessage, @Param('id') id: string) {
    return { data: await this.read.files(await this.viewer(req), id) };
  }

  @Get('loyalty/members/:id/files/:fileId')
  async file(@Req() req: IncomingMessage, @Param('id') id: string, @Param('fileId') fileId: string, @Res() res: ServerResponse) {
    const f = await this.read.file(await this.viewer(req), id, fileId);
    res.setHeader('content-type', f.row.mime);
    res.setHeader('content-disposition', `attachment; filename*=UTF-8''${encodeURIComponent(f.row.name)}`);
    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('cache-control', 'no-store');
    res.end(f.body);
  }

  @Get('loyalty/lookup')
  async lookup(@Req() req: IncomingMessage, @Query('phone') phone: string | undefined) {
    return { data: await this.read.lookup(await this.viewer(req), String(phone ?? '').slice(0, 30)) };
  }

  @Get('loyalty/members/:id')
  async member(@Req() req: IncomingMessage, @Param('id') id: string) {
    return { data: await this.read.member(await this.viewer(req), id) };
  }

  @Get('loyalty/members/:id/ledger')
  async ledger(@Req() req: IncomingMessage, @Param('id') id: string, @Query() q: Record<string, string | undefined>) {
    return this.read.ledger(await this.viewer(req), id, int(q.limit, 'limit', 20), q.cursor);
  }
}
