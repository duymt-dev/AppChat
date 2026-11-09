// GET /v1/contacts/:id/privacy-preview · GET /v1/privacy/operations/:id (TIP-015c §1.2): quyền privacy.erase (Owner only — OWNER_ONLY
// permission, seed roles.ts) ở cả hai route. Chỉ đọc, không ghi gì — writeMới đi qua contact.forget (ActionExecutor, actions.controller.ts).
import { Controller, Get, Inject, Param, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { TENANT_RESOLVER, privacyOperationStatus, privacyPreview } from '@appchat/core';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import { AppError } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

@Controller()
export class PrivacyController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver,
  ) {}

  private async assertPermission(req: IncomingMessage) {
    const a = await this.actors.resolve(req);
    if (!a.authz.isOwner && !a.authz.permissions.has('privacy.erase')) throw new AppError('FORBIDDEN', 403, { permission: 'privacy.erase' });
    return a;
  }

  @Get('contacts/:id/privacy-preview')
  async preview(@Req() req: IncomingMessage, @Param('id') id: string) {
    const a = await this.assertPermission(req);
    const db = await this.tenants.get(TenantContexts.fromMembership(a.workspaceId, a.userId));
    return { data: await privacyPreview(db, id) };
  }

  @Get('privacy/operations/:id')
  async status(@Req() req: IncomingMessage, @Param('id') id: string) {
    const a = await this.assertPermission(req);
    const db = await this.tenants.get(TenantContexts.fromMembership(a.workspaceId, a.userId));
    return { data: await privacyOperationStatus(db, id) };
  }
}
