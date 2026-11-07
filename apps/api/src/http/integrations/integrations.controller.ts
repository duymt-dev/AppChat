// GET /v1/settings/integrations (Blueprint §4.4 integrations — trang Cài đặt › Nền tảng kết nối; shape packages/shared/src/api/integrations.ts).
// Quyền `integrations.manage` (cùng quyền mở mục Cài đặt này — settings registry FE). Ghi qua action integration.*.
import { Controller, Get, Inject, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { IntegrationsReadService, TENANT_RESOLVER } from '@appchat/core';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import { AppError } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

@Controller('settings')
export class IntegrationsController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(IntegrationsReadService) private readonly read: IntegrationsReadService,
    @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver,
  ) {}

  @Get('integrations')
  async list(@Req() req: IncomingMessage) {
    const a = await this.actors.resolve(req);
    if (!a.authz.isOwner && !a.authz.permissions.has('integrations.manage')) throw new AppError('FORBIDDEN', 403, { permission: 'integrations.manage' });
    const db = await this.tenants.get(TenantContexts.fromMembership(a.workspaceId, a.userId));
    return { data: await this.read.list(db, a.workspaceId) };
  }
}
