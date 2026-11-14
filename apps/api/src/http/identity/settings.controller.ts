// Đọc Cài đặt (Blueprint §4.4 misc `GET /v1/settings/:section`, TIP-013): workspace (Tổng quan + Ngôn ngữ), members, roles
// (`/settings/sla` chuyển sang support — TIP-034). Shape `packages/shared/src/api/settings.ts`. Quyền theo settings registry FE: members → `members.manage`,
// workspace / roles → mọi thành viên (mục không khoá quyền). Ghi qua action workspace.* / member.* / invite.* / working_hours.*.
import { Controller, Get, Inject, Query, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { RolesService, SettingsReadService, TENANT_RESOLVER } from '@appchat/core';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import { AppError, type PermissionKey } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver, type RequestActor } from '../kernel/request-actor';

const need = (a: RequestActor, p: PermissionKey) => {
  if (!a.authz.isOwner && !a.authz.permissions.has(p)) throw new AppError('FORBIDDEN', 403, { permission: p });
};

@Controller('settings')
export class SettingsController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(SettingsReadService) private readonly read: SettingsReadService,
    @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver,
    @Inject(RolesService) private readonly roleRead: RolesService,
  ) {}

  @Get('workspace')
  async workspace(@Req() req: IncomingMessage) {
    const a = await this.actors.resolve(req);
    return { data: await this.read.workspace(a.workspaceId, a.userId) };
  }

  /** Danh sách đầy đủ (≤ hạn mức gói) — `{ data, total, seat_limit, next_cursor: null }`. */
  @Get('members')
  async members(@Req() req: IncomingMessage, @Query('q') q?: string) {
    const a = await this.actors.resolve(req);
    need(a, 'members.manage');
    const db = await this.tenants.get(TenantContexts.fromMembership(a.workspaceId, a.userId));
    return this.read.members(a.workspaceId, db, (q ?? '').slice(0, 100));
  }

  @Get('roles')
  async roles(@Req() req: IncomingMessage) {
    const a = await this.actors.resolve(req);
    // Cùng nguồn domain với GET /v1/roles (TIP-042): hệ thống + tuỳ biến còn sống, thêm màu / số lượng.
    return { data: await this.roleRead.settingsRoles(a.workspaceId, a.userId) };
  }
}
