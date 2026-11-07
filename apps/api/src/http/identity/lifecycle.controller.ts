// GET /v1/workspace/lifecycle (TIP-041 §3): trạng thái DB tenant + lệnh vòng đời mới nhất + cảnh báo lưu trữ của workspace X-Workspace-Id.
// Workspace đã lưu trữ / đang khôi phục không có DB tenant → không qua `actors.resolve` (AuthzResolver mở DB tenant): chỉ JWT + membership
// còn hiệu lực ở DB nền tảng (WorkspaceLifecycleReader). Thẻ "Đang khôi phục workspace…" poll route này.
import { Controller, Get, Inject, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { WorkspaceLifecycleReader } from '@appchat/core';
import { AppError } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Controller()
export class LifecycleController {
  constructor(
    @Inject(WorkspaceLifecycleReader) private readonly reader: WorkspaceLifecycleReader,
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
  ) {}

  @Get('workspace/lifecycle')
  async status(@Req() req: IncomingMessage) {
    const userId = await this.actors.user(req);
    const v = req.headers['x-workspace-id'];
    const ws = Array.isArray(v) ? v[0] : v;
    if (!ws || !UUID.test(ws)) throw new AppError('FORBIDDEN', 403, { workspace: 'missing' });
    return { data: await this.reader.status(userId, ws) };
  }
}
