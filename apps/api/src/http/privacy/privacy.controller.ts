// GET /v1/contacts/:id/privacy-preview · GET /v1/privacy/operations/:id · GET /v1/privacy/operations?cursor&limit (TIP-015c §1.2,
// §1.3.2 pha 4): quyền privacy.erase (Owner only — OWNER_ONLY permission, seed roles.ts) ở cả ba route. Chỉ đọc, không ghi gì — ghi mới
// đi qua contact.forget (ActionExecutor, actions.controller.ts).
import { Controller, Get, Inject, Param, Query, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { TENANT_RESOLVER, listPrivacyOperations, privacyOperationStatus, privacyPreview } from '@appchat/core';
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

  @Get('privacy/operations')
  async list(@Req() req: IncomingMessage, @Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    const a = await this.assertPermission(req);
    const db = await this.tenants.get(TenantContexts.fromMembership(a.workspaceId, a.userId));
    const n = limit ? Number(limit) : undefined;
    if (n !== undefined && (!Number.isInteger(n) || n < 1)) throw new AppError('VALIDATION_FAILED', 422, { limit: 'invalid' });
    const r = await listPrivacyOperations(db, { cursor, limit: n });
    return { data: r.items, next_cursor: r.next_cursor };
  }

  @Get('privacy/operations/:id')
  async status(@Req() req: IncomingMessage, @Param('id') id: string) {
    const a = await this.assertPermission(req);
    const db = await this.tenants.get(TenantContexts.fromMembership(a.workspaceId, a.userId));
    return { data: await privacyOperationStatus(db, id) };
  }
}
