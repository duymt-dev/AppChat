// Controller HTTP domain insights (Blueprint §4.4 dashboard / insights, TIP-038): `GET /v1/insights/:metric?from&to&bucket…` — cùng registry
// với action `insight.query`; cổng `insights.view` (Owner luôn được — resolver). Tham số query chỉ là chuỗi / số nguyên của metric — handler
// kiểm strict theo metric (khoá lạ → 422). `GET /v1/agents/:id/stats?from&to` — thống kê agent có nguồn (insights.view hoặc agents.manage;
// từng chỉ số còn kiểm quyền nguồn riêng).
import { Controller, Get, Inject, Param, Query, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { InsightsReadService } from '@appchat/core';
import { AppError, can } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

@Controller()
export class InsightsController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(InsightsReadService) private readonly read: InsightsReadService,
  ) {}

  @Get('insights/:metric')
  async metric(@Req() req: IncomingMessage, @Param('metric') metric: string, @Query() q: Record<string, string>) {
    const a = await this.actors.resolve(req);
    if (!can(a.authz, 'insights.view')) throw new AppError('FORBIDDEN', 403, { permission: 'insights.view' });
    return { data: await this.read.metric({ workspaceId: a.workspaceId, userId: a.userId, authz: a.authz }, metric, q) };
  }

  @Get('agents/:id/stats')
  async agentStats(@Req() req: IncomingMessage, @Param('id') id: string, @Query('from') from?: string, @Query('to') to?: string) {
    const a = await this.actors.resolve(req);
    if (!can(a.authz, 'insights.view') && !can(a.authz, 'agents.manage')) throw new AppError('FORBIDDEN', 403, { permission: 'insights.view' });
    return { data: await this.read.agent({ workspaceId: a.workspaceId, userId: a.userId, authz: a.authz }, id, { ...(from ? { from } : {}), ...(to ? { to } : {}) }) };
  }
}
