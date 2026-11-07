// Thẻ duyệt của một hội thoại (TIP-025b §G.1): GET /v1/conversations/:id/approvals — yêu cầu duyệt gắn hội thoại qua run tin cậy;
// ngoài scope inbox → 404, không có approvals.decide → rỗng. Quyết định vẫn qua approval.approve / reject / edit_and_approve.
import { Controller, Get, Inject, Param, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { InboxReadService, conversationApprovals } from '@appchat/core';
import { AppError } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

@Controller()
export class InboxApprovalsController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(InboxReadService) private readonly read: InboxReadService,
  ) {}

  @Get('conversations/:id/approvals')
  async list(@Req() req: IncomingMessage, @Param('id') id: string) {
    const v = await this.actors.resolve(req);
    if (!v.authz.isOwner && !v.authz.permissions.has('inbox.view')) throw new AppError('FORBIDDEN', 403, { permission: 'inbox.view' });
    const p = await this.read.place(v);
    return { data: await this.read.tx(v, (tx) => conversationApprovals(tx, v.authz, id, p.now, p.timeZone)) };
  }
}
