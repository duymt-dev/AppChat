// Tác vụ tự chủ (TIP-035, Blueprint §4.4 ai): GET /v1/ai-tasks — màn Coworks (shape packages/shared/src/api/ai-tasks.ts). Quyền
// `ai_task.manage`. Chủ sở hữu / Quản lý (data scope insights `all`) thấy mọi tác vụ; vai trò khác chỉ thấy tác vụ mình tạo (D51 — tác
// vụ chạy bằng quyền người tạo). Ghi qua action ai_task.*.
import { Controller, Get, Inject, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { CLOCK, TENANT_RESOLVER, TaskPlace, listAiTasks, type Clock } from '@appchat/core';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import { AppError } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

@Controller()
export class AiTasksController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver,
    @Inject(TaskPlace) private readonly place: TaskPlace,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  @Get('ai-tasks')
  async list(@Req() req: IncomingMessage) {
    const a = await this.actors.resolve(req);
    if (!a.authz.isOwner && !a.authz.permissions.has('ai_task.manage')) throw new AppError('FORBIDDEN', 403, { permission: 'ai_task.manage' });
    const db = await this.tenants.get(TenantContexts.fromMembership(a.workspaceId, a.userId));
    const all = a.authz.isOwner || a.authz.scope.insights === 'all';
    return { data: await listAiTasks(db, await this.place.of(a.workspaceId), this.clock.now(), all ? undefined : a.userId) };
  }
}
