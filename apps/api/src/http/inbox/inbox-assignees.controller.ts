// Ứng viên phụ trách hội thoại (TIP-025b §B.6): GET /v1/conversations/:id/assignees?cursor=&q= — người + agent kèm tải mở, cần inbox.assign
// + thấy hội thoại. Ghi vẫn chỉ qua conversation.assign (kiểm thành viên hiện hành).
import { Controller, Get, Inject, Param, Query, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { CrmMembers, InboxReadService, assigneeCandidates } from '@appchat/core';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

@Controller()
export class InboxAssigneesController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(InboxReadService) private readonly read: InboxReadService,
    @Inject(CrmMembers) private readonly members: CrmMembers,
  ) {}

  @Get('conversations/:id/assignees')
  async list(@Req() req: IncomingMessage, @Param('id') id: string, @Query('cursor') cursor?: string, @Query('q') q?: string) {
    const v = await this.actors.resolve(req);
    return this.read.tx(v, (tx) => assigneeCandidates(tx, v.authz, this.members, v.workspaceId, id, cursor, (q ?? '').slice(0, 80)));
  }
}
