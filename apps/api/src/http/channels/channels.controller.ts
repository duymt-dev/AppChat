// Cài đặt › Kênh kết nối (Blueprint §4.4 channels; shape packages/shared/src/api/channels.ts): danh sách kênh + tài khoản,
// hiệu suất 7 ngày, trạng thái đăng nhập QR. Quyền `channels.manage` (cùng quyền mở mục Cài đặt này). Ghi qua action channel.*.
import { Controller, Get, Inject, Param, Query, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { ChannelsReadService, TENANT_RESOLVER } from '@appchat/core';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import { AppError } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

@Controller('settings/channels')
export class ChannelsController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(ChannelsReadService) private readonly read: ChannelsReadService,
    @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver,
  ) {}

  private async db(req: IncomingMessage) {
    const a = await this.actors.resolve(req);
    if (!a.authz.isOwner && !a.authz.permissions.has('channels.manage')) throw new AppError('FORBIDDEN', 403, { permission: 'channels.manage' });
    return this.tenants.get(TenantContexts.fromMembership(a.workspaceId, a.userId));
  }

  @Get()
  async list(@Req() req: IncomingMessage, @Query('filter') filter?: string) {
    const f = filter === 'on' || filter === 'off' ? filter : 'all';
    return { data: await this.read.list(await this.db(req), f) };
  }

  @Get(':id/stats')
  async stats(@Req() req: IncomingMessage, @Param('id') id: string, @Query('days') days?: string) {
    return { data: await this.read.stats(await this.db(req), id, Number(days ?? 7)) };
  }

  @Get(':id/login')
  async login(@Req() req: IncomingMessage, @Param('id') id: string) {
    return { data: await this.read.login(await this.db(req), id) };
  }
}
