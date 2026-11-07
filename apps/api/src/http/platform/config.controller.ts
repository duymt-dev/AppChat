// GET /v1/admin/config/{plans,providers,routes,prices,templates} (TIP-040 pha 2): đọc cấu hình nền tảng cho màn /admin. Chỉ admin nền
// tảng (kiểm sống mỗi request), không X-Workspace-Id. Provider không bao giờ trả key / giá trị header. Ghi = action admin.* qua executor.
import { Controller, Get, Inject, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { ConfigReadService, PLATFORM_DB } from '@appchat/core';
import type { PlatformDb } from '@appchat/db';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';
import { platformAdmin } from './admin-actor';

@Controller('admin/config')
export class AdminConfigController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(PLATFORM_DB) private readonly platform: PlatformDb,
    @Inject(ConfigReadService) private readonly read: ConfigReadService,
  ) {}

  private gate(req: IncomingMessage) {
    return platformAdmin(this.actors, this.platform, req);
  }

  @Get('plans')
  async plans(@Req() req: IncomingMessage) {
    await this.gate(req);
    return { data: await this.read.plans() };
  }

  @Get('providers')
  async providers(@Req() req: IncomingMessage) {
    await this.gate(req);
    return { data: await this.read.providers() };
  }

  @Get('routes')
  async routes(@Req() req: IncomingMessage) {
    await this.gate(req);
    return { data: await this.read.routes() };
  }

  @Get('prices')
  async prices(@Req() req: IncomingMessage) {
    await this.gate(req);
    return { data: await this.read.prices() };
  }

  @Get('templates')
  async templates(@Req() req: IncomingMessage) {
    await this.gate(req);
    return { data: await this.read.templates() };
  }
}
