// Đọc phụ trợ Hộp thư (Blueprint §4.4 inbox + settings, TIP-016): /v1/inbox/accounts, /inbox/channels, /inbox/connect-channels,
// /groups/:id, /canned-replies, /tags (quyền `inbox.view`); /settings/tags, /settings/replies (Cài đặt — `inbox.manage`); /nav/badges (số đếm
// trên rail — mọi thành viên, khoá theo quyền từng module — TIP-016b).
import { Controller, Get, Inject, Optional, Param, Query, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import type { PlatformDb, TenantDbResolver } from '@appchat/db';
import { CLOCK, InboxMetaService, NavBadgesService, PLATFORM_DB, TENANT_RESOLVER, type Clock } from '@appchat/core';
import { AppError, type PermissionKey } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

@Controller()
export class InboxMetaController {
  private readonly badges: NavBadgesService | null;

  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(InboxMetaService) private readonly meta: InboxMetaService,
    @Inject(CLOCK) clock: Clock,
    @Optional() @Inject(TENANT_RESOLVER) tenants?: TenantDbResolver,
    @Optional() @Inject(PLATFORM_DB) platform?: PlatformDb,
  ) {
    this.badges = tenants && platform ? new NavBadgesService(tenants, platform, () => clock.now()) : null;
  }

  @Get('nav/badges')
  async navBadges(@Req() req: IncomingMessage) {
    const a = await this.actors.resolve(req);
    return { data: this.badges ? await this.badges.read(a) : {} };
  }

  private async viewer(req: IncomingMessage, perm: PermissionKey = 'inbox.view') {
    const a = await this.actors.resolve(req);
    if (!a.authz.isOwner && !a.authz.permissions.has(perm)) throw new AppError('FORBIDDEN', 403, { permission: perm });
    return a;
  }

  @Get('inbox/accounts')
  async accounts(@Req() req: IncomingMessage) {
    return { data: await this.meta.accounts(await this.viewer(req)) };
  }

  @Get('inbox/channels')
  async channels(@Req() req: IncomingMessage) {
    await this.viewer(req);
    return { data: this.meta.channels() };
  }

  @Get('inbox/connect-channels')
  async connect(@Req() req: IncomingMessage) {
    await this.viewer(req);
    return { data: this.meta.connectChannels() };
  }

  @Get('groups/:id')
  async group(@Req() req: IncomingMessage, @Param('id') id: string) {
    return { data: await this.meta.group(await this.viewer(req), id) };
  }

  @Get('canned-replies')
  async canned(@Req() req: IncomingMessage) {
    return { data: await this.meta.canned(await this.viewer(req)) };
  }

  @Get('tags')
  async tags(@Req() req: IncomingMessage) {
    return { data: await this.meta.tagOptions(await this.viewer(req)) };
  }

  @Get('settings/tags')
  async settingsTags(@Req() req: IncomingMessage, @Query('q') q?: string) {
    return { data: await this.meta.settingsTags(await this.viewer(req, 'inbox.manage'), q?.slice(0, 100)) };
  }

  @Get('settings/replies')
  async settingsReplies(@Req() req: IncomingMessage, @Query('q') q?: string) {
    return { data: await this.meta.replies(await this.viewer(req, 'inbox.manage'), q?.slice(0, 100)) };
  }
}
