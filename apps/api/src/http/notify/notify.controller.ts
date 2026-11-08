// GET /v1/notifications?unread=&cursor=&limit= (Blueprint §4.4 misc) · GET /v1/settings/notifications (tuỳ chọn của tôi).
// Chỉ đọc thông báo của CHÍNH người gọi; `title` đã render theo locale người nhận lúc gửi, `ago` theo locale người xem.
// Thông báo chuyển phụ trách (TIP-015d) chiếu tên khách / link theo quyền hiện tại của người gọi.
import { Controller, Get, Inject, Query, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import { CLOCK, NotifyPrefsService, PLATFORM_DB, TENANT_RESOLVER, listNotifications, type Clock } from '@appchat/core';
import { AppError } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

@Controller()
export class NotifyController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(NotifyPrefsService) private readonly prefs: NotifyPrefsService,
    @Inject(PLATFORM_DB) private readonly platform: PlatformDb,
    @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  @Get('notifications')
  async list(@Req() req: IncomingMessage, @Query('unread') unread?: string, @Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    const a = await this.actors.resolve(req);
    const n = limit === undefined ? undefined : Number(limit);
    if (n !== undefined && !Number.isInteger(n)) throw new AppError('VALIDATION_FAILED', 400, { limit: 'invalid' });
    const [user, ws] = await Promise.all([
      this.platform.user.findUnique({ where: { id: a.userId }, select: { locale: true } }),
      this.platform.workspace.findUnique({ where: { id: a.workspaceId }, select: { timezone: true } }),
    ]);
    const db = await this.tenants.get(TenantContexts.fromMembership(a.workspaceId, a.userId));
    return listNotifications(db, {
      userId: a.userId,
      unread: unread === 'true' || unread === '1',
      cursor: cursor || undefined,
      limit: n,
      locale: user?.locale ?? 'vi',
      timeZone: ws?.timezone ?? 'Asia/Ho_Chi_Minh',
      nowMs: this.clock.now().getTime(),
    }, { platform: this.platform, viewer: a.authz });
  }

  @Get('settings/notifications')
  async settings(@Req() req: IncomingMessage) {
    const a = await this.actors.resolve(req);
    return { data: await this.prefs.view(a.userId) };
  }
}
