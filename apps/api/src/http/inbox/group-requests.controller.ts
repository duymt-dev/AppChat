// GET /v1/conversation-groups/:id (TIP-023b SPEC D): trạng thái yêu cầu tạo nhóm — đọc đúng một id, scope kiểm trước payload (GroupRead);
// chỉ đọc, không có GET thay đổi trạng thái. Tạo nhóm đi qua POST /v1/actions/conversation.create_group.
import { Controller, Get, Inject, Param, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { GroupRead } from '@appchat/core';
import { AppError } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

@Controller()
export class GroupRequestsController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(GroupRead) private readonly groups: GroupRead | null,
  ) {}

  @Get('conversation-groups/:id')
  async get(@Req() req: IncomingMessage, @Param('id') id: string) {
    const a = await this.actors.resolve(req);
    if (!a.authz.isOwner && !a.authz.permissions.has('inbox.view')) throw new AppError('FORBIDDEN', 403, { permission: 'inbox.view' });
    if (!this.groups) throw new AppError('NOT_IMPLEMENTED', 501);
    return { data: await this.groups.get({ workspaceId: a.workspaceId, userId: a.userId, authz: a.authz }, id) };
  }
}
