// GET /v1/admin/session (TIP-040): màn /admin hỏi "tôi có phải admin nền tảng không" — 200 kèm thông tin tối thiểu, không phải admin → 403
// (AdminGuard chặn vào màn). Mọi route quản trị vẫn tự kiểm lại phía server.
import { Controller, Get, Inject, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { PLATFORM_DB } from '@appchat/core';
import type { PlatformDb } from '@appchat/db';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';
import { platformAdmin } from './admin-actor';

@Controller('admin')
export class AdminSessionController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(PLATFORM_DB) private readonly platform: PlatformDb,
  ) {}

  @Get('session')
  async session(@Req() req: IncomingMessage) {
    const id = await platformAdmin(this.actors, this.platform, req);
    const u = await this.platform.user.findUniqueOrThrow({ where: { id }, select: { name: true, email: true, locale: true } });
    return { data: { user_id: id, name: u.name, email: u.email, locale: u.locale, platform_admin: true } };
  }
}
