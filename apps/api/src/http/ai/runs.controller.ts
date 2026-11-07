// Chi tiết run có scope (TIP-019b §5.2, DC-380): GET /v1/runs/:id · /v1/runs/:id/steps · /v1/runs/:id/children (cursor, limit 1–100,
// mặc định 30). Quyền qua `readableRun` (assistant.use + runScope theo người khởi tạo run gốc); không có / ngoài phạm vi → 404 như nhau.
import { Controller, Get, Inject, Param, Query, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { TENANT_RESOLVER, runChildren, runDetail, runSteps } from '@appchat/core';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import { AppError } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

const notFound = () => new AppError('NOT_FOUND', 404);

function limitOf(raw?: string): number | undefined {
  if (raw === undefined) return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 100) throw new AppError('VALIDATION_FAILED', 400, { limit: 'invalid' });
  return n;
}

@Controller('runs')
export class RunsController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver,
  ) {}

  private async ctx(req: IncomingMessage) {
    const a = await this.actors.resolve(req);
    return { a, db: await this.tenants.get(TenantContexts.fromMembership(a.workspaceId, a.userId)) };
  }

  @Get(':id')
  async detail(@Req() req: IncomingMessage, @Param('id') id: string) {
    const { a, db } = await this.ctx(req);
    const data = await runDetail(db, a.authz, id);
    if (!data) throw notFound();
    return { data };
  }

  @Get(':id/steps')
  async steps(@Req() req: IncomingMessage, @Param('id') id: string, @Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    const { a, db } = await this.ctx(req);
    const page = await runSteps(db, a.authz, id, { cursor, limit: limitOf(limit) });
    if (!page) throw notFound();
    return page;
  }

  @Get(':id/children')
  async children(@Req() req: IncomingMessage, @Param('id') id: string, @Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    const { a, db } = await this.ctx(req);
    const page = await runChildren(db, a.authz, id, { cursor, limit: limitOf(limit) });
    if (!page) throw notFound();
    return page;
  }
}
