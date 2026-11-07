// GET /v1/inbox/channel-operations/:id (TIP-014b A): trạng thái lệnh thu hồi / cảm xúc trên tin — đúng một id, quyền hộp thư + scope hội
// thoại kiểm trước payload (ChannelOperationRead); lệnh không phải thao tác tin → 404. Chỉ đọc; tạo lệnh qua POST /v1/actions/message.*.
import { Controller, Get, Inject, Param, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { ChannelOperationRead } from '@appchat/core';
import { AppError } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

@Controller()
export class ChannelOperationsController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(ChannelOperationRead) private readonly ops: ChannelOperationRead | null,
  ) {}

  @Get('inbox/channel-operations/:id')
  async get(@Req() req: IncomingMessage, @Param('id') id: string) {
    const a = await this.actors.resolve(req);
    if (!this.ops) throw new AppError('NOT_IMPLEMENTED', 501);
    return { data: await this.ops.get({ workspaceId: a.workspaceId, userId: a.userId, authz: a.authz }, id) };
  }
}
