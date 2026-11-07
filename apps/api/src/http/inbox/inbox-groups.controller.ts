// Quản lý nhóm Zalo trong Hộp thư (TIP-025b §A): GET /v1/conversations/:id/group (trạng thái nhóm — chính sách + revision, số quan sát,
// ảnh chụp nhà cung cấp, thao tác hỗ trợ, lệnh mở), GET /v1/conversations/:id/group/candidates (khách 1-1 cùng tài khoản trong scope),
// GET /v1/inbox/group-commands/:id (trạng thái một lệnh nhóm — route riêng, không mở rộng route thao tác tin 014b; lệnh `link` chỉ người
// yêu cầu, URL 10 phút), GET /v1/conversations/:id/group/board (bảng tin có trang — §A.7). Ghi qua group.*.
import { Controller, Get, Inject, Optional, Param, Query, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import type { ChannelRegistry } from '@appchat/channels';
import { CHANNEL_REGISTRY, CLOCK, ENC_KEY, InboxReadService, groupBoard, groupCandidates, groupCommand, groupState, type Clock } from '@appchat/core';
import { AppError, GROUP_BOARD_KINDS, type GroupBoardKind } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

@Controller()
export class InboxGroupsController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(InboxReadService) private readonly read: InboxReadService,
    @Inject(CHANNEL_REGISTRY) private readonly registry: ChannelRegistry,
    @Inject(CLOCK) private readonly clock: Clock,
    @Optional() @Inject(ENC_KEY) private readonly key: Buffer | null,
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
    return { data: await this.read.tx(v, (tx) => groupCommand(tx, v.authz, id, this.clock.now(), this.key ?? undefined)) };
  }

  /** Bảng tin nhóm (§A.7): tin ghim + một loại mục (ảnh / tệp / link / ghi chú) theo trang. */
  @Get('conversations/:id/group/board')
  async board(@Req() req: IncomingMessage, @Param('id') id: string, @Query('kind') kind?: string, @Query('cursor') cursor?: string) {
    const v = await this.viewer(req);
    const k = (kind ?? 'media') as GroupBoardKind;
    if (!GROUP_BOARD_KINDS.includes(k)) throw new AppError('VALIDATION_FAILED', 400, { kind: 'invalid' });
    return { data: await this.read.tx(v, (tx) => groupBoard(tx, v.authz, id, k, cursor)) };
  }
}
