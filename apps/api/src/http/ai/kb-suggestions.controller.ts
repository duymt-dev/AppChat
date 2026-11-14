// Hàng chờ học từ hội thoại (TIP-043, Blueprint §4.4 `GET /v1/kb/suggestions?status=&cursor=&limit=` + `/:id`): quyền `kb.manage`, DB
// tenant theo người gọi; hỏi–đáp đã che PII; liên kết hội thoại gốc chỉ khi người xem có quyền inbox thấy hội thoại (repo kiểm). Ghi qua
// action `kb.suggestion.approve` / `reject` (POST /v1/actions/:id).
import { Controller, Get, Inject, Param, Query, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { PLATFORM_DB, TENANT_RESOLVER, getSuggestion, listSuggestions, type SuggestionStatus } from '@appchat/core';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import { AppError, KB_SUGGESTION_LIMITS, KB_SUGGESTION_STATUSES } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

@Controller()
export class KbSuggestionsController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver,
    @Inject(PLATFORM_DB) private readonly platform: PlatformDb,
  ) {}

  private async ctx(req: IncomingMessage) {
    const a = await this.actors.resolve(req);
    if (!a.authz.isOwner && !a.authz.permissions.has('kb.manage')) throw new AppError('FORBIDDEN', 403, { permission: 'kb.manage' });
    return { a, db: await this.tenants.get(TenantContexts.fromMembership(a.workspaceId, a.userId)) };
  }

  private names = async (ids: string[]) =>
    new Map((ids.length ? await this.platform.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true } }) : []).map((u) => [u.id, u.name || u.email]));

  @Get('kb/suggestions')
  async list(@Req() req: IncomingMessage, @Query('status') status?: string, @Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    const st = (status || 'pending') as SuggestionStatus;
    if (!(KB_SUGGESTION_STATUSES as readonly string[]).includes(st)) throw new AppError('VALIDATION_FAILED', 400, { status: 'invalid' });
    const n = limit === undefined || limit === '' ? undefined : Number(limit);
    if (n !== undefined && (!Number.isInteger(n) || n < 1 || n > KB_SUGGESTION_LIMITS.page)) throw new AppError('VALIDATION_FAILED', 400, { limit: 'invalid' });
    const { a, db } = await this.ctx(req);
    return listSuggestions(db, a.authz, { status: st, ...(n ? { limit: n } : {}), ...(cursor ? { cursor } : {}) }, this.names);
  }

  @Get('kb/suggestions/:id')
  async get(@Req() req: IncomingMessage, @Param('id') id: string) {
    const { a, db } = await this.ctx(req);
    return { data: await getSuggestion(db, a.authz, id, this.names) };
  }
}
