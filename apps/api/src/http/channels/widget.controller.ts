// Cài đặt › Trợ lý AI website (TIP-017; shape packages/shared/src/api/webchat.ts): cấu hình widget + mã nhúng + KPI. Quyền
// `channels.manage` (như Kênh kết nối). Ghi qua action `webchat.update_widget`.
import { Controller, Get, Inject, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { PLATFORM_DB, TENANT_RESOLVER, WIDGET_URLS, widgetSettings, type WidgetUrls } from '@appchat/core';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import { AppError } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

@Controller('settings/widget')
export class WidgetController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver,
    @Inject(PLATFORM_DB) private readonly platform: PlatformDb,
    @Inject(WIDGET_URLS) private readonly urls: WidgetUrls,
  ) {}

  @Get()
  async get(@Req() req: IncomingMessage) {
    const a = await this.actors.resolve(req);
    if (!a.authz.isOwner && !a.authz.permissions.has('channels.manage')) throw new AppError('FORBIDDEN', 403, { permission: 'channels.manage' });
    const db = await this.tenants.get(TenantContexts.fromMembership(a.workspaceId, a.userId));
    const u = await this.platform.user.findUnique({ where: { id: a.userId }, select: { locale: true } });
    return { data: await widgetSettings(db, this.urls, u?.locale ?? 'vi') };
  }
}
