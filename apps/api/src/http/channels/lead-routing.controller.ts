// Cài đặt › Chia lead (TIP-042b, Blueprint §4.4; shape packages/shared/src/api/lead-routing.ts): GET /v1/settings/lead-routing — rule
// mặc định + ghi đè từng tài khoản kênh + ứng viên. Quyền `crm.reassign`. Ghi chỉ qua action `lead_routing.update`.
import { Controller, Get, Inject, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { LeadRoutingReadService } from '@appchat/core';
import { AppError } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

@Controller('settings/lead-routing')
export class LeadRoutingController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(LeadRoutingReadService) private readonly read: LeadRoutingReadService,
  ) {}

  @Get()
  async get(@Req() req: IncomingMessage) {
    const a = await this.actors.resolve(req);
    if (!a.authz.isOwner && !a.authz.permissions.has('crm.reassign')) throw new AppError('FORBIDDEN', 403, { permission: 'crm.reassign' });
    return { data: await this.read.get(a.workspaceId, a.userId) };
  }
}
