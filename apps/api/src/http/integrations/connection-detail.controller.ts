// GET /v1/integrations/connectors · /connections/:id · /connections/:id/logs?cursor=&limit= · /connections/:id/calls/:callId
// (TIP-012b P3 §5.1). Quyền `integrations.manage` + membership hiện tại; id lạ / khác workspace → 404 chung. Không bí mật, không thân
// request, không giao dịch / số tiền — chi tiết tài chính ở route finance với quyền của nó. Cùng reader với action integration.get /
// integration.list_calls. Giữ /v1/settings/integrations cho client cũ.
import { Controller, Get, Inject, Param, Query, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { ConnectionDetailReader, TENANT_RESOLVER } from '@appchat/core';
import { connectorRegistry } from '@appchat/integrations';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import { AppError } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

@Controller('integrations')
export class ConnectionDetailController {
  private readonly reader = new ConnectionDetailReader(connectorRegistry);

  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver,
  ) {}

  private async db(req: IncomingMessage) {
    const a = await this.actors.resolve(req);
    if (!a.authz.isOwner && !a.authz.permissions.has('integrations.manage')) throw new AppError('FORBIDDEN', 403, { permission: 'integrations.manage' });
    return this.tenants.get(TenantContexts.fromMembership(a.workspaceId, a.userId));
  }

  @Get('connectors')
  async connectors(@Req() req: IncomingMessage) {
    return { data: await this.reader.connectors(await this.db(req)) };
  }

  @Get('connections/:id')
  async detail(@Req() req: IncomingMessage, @Param('id') id: string) {
    return { data: await this.reader.detail(await this.db(req), id) };
  }

  @Get('connections/:id/logs')
  async logs(@Req() req: IncomingMessage, @Param('id') id: string, @Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    const n = limit === undefined ? 20 : Number(limit);
    if (!Number.isInteger(n) || n < 1 || n > 50) throw new AppError('VALIDATION_FAILED', 422, { limit: 'invalid' });
    const page = await this.reader.logs(await this.db(req), id, cursor || undefined, n);
    return { data: page.items, next_cursor: page.next_cursor };
  }

  @Get('connections/:id/calls/:callId')
  async call(@Req() req: IncomingMessage, @Param('id') id: string, @Param('callId') callId: string) {
    return { data: await this.reader.call(await this.db(req), id, callId) };
  }
}
