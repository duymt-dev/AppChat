// GET /v1/admin/workspaces?status=&plan=&q=&cursor=&limit= (TIP-040 pha 4): danh sách workspace cho admin nền tảng (kiểm sống), không
// mở DB tenant; số liệu từ workspace_stats (chưa làm tươi → null). Tạm dừng / mở lại = action admin.workspace.*.
import { Controller, Get, Inject, Query, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { PLATFORM_DB, WorkspacesReadService } from '@appchat/core';
import type { PlatformDb } from '@appchat/db';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';
import { platformAdmin } from './admin-actor';

@Controller('admin')
export class AdminWorkspacesController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(PLATFORM_DB) private readonly platform: PlatformDb,
    @Inject(WorkspacesReadService) private readonly read: WorkspacesReadService,
  ) {}

  @Get('workspaces')
  async list(@Req() req: IncomingMessage, @Query() q: Record<string, string | undefined>) {
    await platformAdmin(this.actors, this.platform, req);
    const s = (k: string) => (typeof q[k] === 'string' ? { [k]: q[k] } : {});
    return this.read.list({ ...s('status'), ...s('plan'), ...s('q'), ...s('cursor'), ...s('limit') });
  }
}
