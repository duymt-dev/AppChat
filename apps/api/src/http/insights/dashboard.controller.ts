// `GET /v1/dashboard` (Blueprint §4.4 dashboard, TIP-038 pha 2): Tổng quan của người gọi — mọi thành viên workspace xem được màn này; từng
// khối kiểm quyền + scope riêng ở DashboardService (không quyền → khối rỗng / null, không payload ẩn). Ghi qua action (onboarding.toggle_step,
// follow_up.complete) — GET không có side effect.
import { Controller, Get, Inject, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { DashboardService } from '@appchat/core';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

@Controller()
export class DashboardController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(DashboardService) private readonly dashboard: DashboardService,
  ) {}

  @Get('dashboard')
  async read(@Req() req: IncomingMessage) {
    const a = await this.actors.resolve(req);
    return { data: await this.dashboard.read({ workspaceId: a.workspaceId, userId: a.userId, authz: a.authz }) };
  }
}
