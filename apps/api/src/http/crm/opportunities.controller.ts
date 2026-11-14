// GET /v1/contacts/:id/opportunities?cursor=&limit= · GET /v1/opportunities/:id (TIP-026c §4.1): danh sách cơ hội của khách (keyset, mặc
// định 20) và drawer Cơ hội 360° (thẻ + chuỗi chứng từ theo quyền + lịch sử) — cùng reader với action contact_opportunity.list / .get.
// crm.view + quyền khách cha HIỆN TẠI mỗi lần đọc; ngoài scope → 404 đồng nhất; tiền theo quote.view (vắng + amount_hidden).
import { Controller, Get, Inject, Param, Query, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { CrmReadService } from '@appchat/core';
import { AppError } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Controller()
export class OpportunitiesController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(CrmReadService) private readonly read: CrmReadService,
  ) {}

  private async viewer(req: IncomingMessage) {
    const v = await this.actors.resolve(req);
    if (!v.authz.isOwner && !v.authz.permissions.has('crm.view')) throw new AppError('FORBIDDEN', 403, { permission: 'crm.view' });
    return v;
  }

  @Get('contacts/:id/opportunities')
  async list(@Req() req: IncomingMessage, @Param('id') id: string, @Query() q: Record<string, string | undefined>) {
    const v = await this.viewer(req);
    if (!UUID.test(id)) throw new AppError('NOT_FOUND', 404, { contact_id: 'not_found' });
    const limit = q.limit === undefined ? undefined : Number(q.limit);
    if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 50)) throw new AppError('VALIDATION_FAILED', 400, { limit: 'invalid' });
    const page = await this.read.opportunities(v, id, { cursor: q.cursor, limit });
    return { data: page.items, next_cursor: page.next_cursor };
  }

  @Get('opportunities/:id')
  async detail(@Req() req: IncomingMessage, @Param('id') id: string) {
    const v = await this.viewer(req);
    if (!UUID.test(id)) throw new AppError('NOT_FOUND', 404, { opportunity_id: 'not_found' });
    return { data: await this.read.opportunity(v, id) };
  }
}
