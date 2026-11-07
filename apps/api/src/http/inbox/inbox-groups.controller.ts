// Quản lý nhóm Zalo trong Hộp thư (TIP-025b §A): GET /v1/conversations/:id/group (trạng thái nhóm — chính sách + revision, số quan sát,
// ảnh chụp nhà cung cấp, thao tác hỗ trợ, lệnh mở), GET /v1/conversations/:id/group/candidates (khách 1-1 cùng tài khoản trong scope),
// GET /v1/inbox/group-commands/:id (trạng thái một lệnh nhóm — route riêng, không mở rộng route thao tác tin 014b). Ghi qua group.*.
import { Controller, Get, Inject, Param, Query, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import type { ChannelRegistry } from '@appchat/channels';
import { CHANNEL_REGISTRY, InboxReadService, groupCandidates, groupCommand, groupState } from '@appchat/core';
import { AppError } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

@Controller()
export class InboxGroupsController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(InboxReadService) private readonly read: InboxReadService,
    @Inject(CHANNEL_REGISTRY) private readonly registry: ChannelRegistry,
  ) {}

  private async viewer(req: IncomingMessage) {
    const a = await this.actors.resolve(req);
    if (!a.authz.isOwner && !a.authz.permissions.has('inbox.view')) throw new AppError('FORBIDDEN', 403, { permission: 'inbox.view' });
    return a;
  }

  @Get('conversations/:id/group')
  async state(@Req() req: IncomingMessage, @Param('id') id: string) {
    const v = await this.viewer(req);
    return { data: await this.read.tx(v, (tx) => groupState(tx, v.authz, this.registry, id)) };
  }

  @Get('conversations/:id/group/candidates')
  async candidates(@Req() req: IncomingMessage, @Param('id') id: string, @Query('cursor') cursor?: string) {
    const v = await this.viewer(req);
    if (!v.authz.isOwner && !v.authz.permissions.has('inbox.manage')) throw new AppError('FORBIDDEN', 403, { permission: 'inbox.manage' });
    return this.read.tx(v, (tx) => groupCandidates(tx, v.authz, id, cursor));
  }

  @Get('inbox/group-commands/:id')
  async command(@Req() req: IncomingMessage, @Param('id') id: string) {
    const v = await this.viewer(req);
    return { data: await this.read.tx(v, (tx) => groupCommand(tx, v.authz, id)) };
  }
}
