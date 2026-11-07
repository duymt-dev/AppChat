// GET /v1/me/authz · /v1/roles · /v1/permissions · /v1/teams (Blueprint §4.4 authz) — cần X-Workspace-Id + membership.
// /me/authz đúng shape FE `useCan` đang đọc (mock routes.ts): { role, is_owner, permissions, scope, team_ids }.
import { Controller, Get, Inject, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { RolesService, WorkspacesService } from '@appchat/core';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

@Controller()
export class AuthzController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(RolesService) private readonly roles: RolesService,
    @Inject(WorkspacesService) private readonly workspaces: WorkspacesService,
  ) {}

  @Get('me/authz')
  async me(@Req() req: IncomingMessage) {
    const a = await this.actors.resolve(req);
    const m = await this.workspaces.membership(a.userId, a.workspaceId);
    return {
      data: {
        role: m!.roleKey,
        is_owner: a.authz.isOwner,
        permissions: [...a.authz.permissions].sort(),
        scope: a.authz.scope,
        team_ids: a.authz.teamIds,
      },
    };
  }

  @Get('roles')
  async list(@Req() req: IncomingMessage) {
    const a = await this.actors.resolve(req);
    return { data: await this.roles.roles(a.workspaceId, a.userId) };
  }

  @Get('permissions')
  async permissions(@Req() req: IncomingMessage) {
    await this.actors.resolve(req);
    return { data: this.roles.permissions() };
  }

  @Get('teams')
  async teams(@Req() req: IncomingMessage) {
    const a = await this.actors.resolve(req);
    return { data: await this.roles.teams(a.workspaceId, a.userId) };
  }
}
