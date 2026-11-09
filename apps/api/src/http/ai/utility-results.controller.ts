// Kết quả kỹ năng tiện ích AI (TIP-019c §3.4): GET /v1/ai-utilities/:runId/result — quyền như đọc run (assistant.use + runScope).
// Không có / sai loại / ngoài phạm vi → 404 đồng nhất, không lộ lý do cụ thể.
import { Controller, Get, Inject, Param, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { TENANT_RESOLVER, utilityResult } from '@appchat/core';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import { AppError } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

@Controller('ai-utilities')
export class UtilityResultsController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver,
  ) {}

  @Get(':runId/result')
  async result(@Req() req: IncomingMessage, @Param('runId') runId: string) {
    const a = await this.actors.resolve(req);
    const db = await this.tenants.get(TenantContexts.fromMembership(a.workspaceId, a.userId));
    const data = await utilityResult(db, a.authz, runId);
    if (!data) throw new AppError('NOT_FOUND', 404);
    return { data };
  }
}
