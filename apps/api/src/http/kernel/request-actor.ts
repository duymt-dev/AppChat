// Người gọi + workspace của request (Blueprint §4.1; response-envelope §8: thiếu / sai X-Workspace-Id → 403 TRƯỚC khi mở DB tenant).
// TIP-004: Bearer access JWT → user; X-Workspace-Id → membership `active` ở DB nền tảng.
// TIP-005: AuthzContext từ AuthzResolver (Owner theo workspace, vai trò hệ thống / tuỳ biến, uỷ quyền, nhóm, cache Redis).
import { AppError, type AuthzContext } from '@appchat/shared';
import type { IncomingMessage } from 'node:http';
import type { AccessTokens, AuthzResolver, Clock, WorkspacesService } from '@appchat/core';

export interface RequestActor {
  workspaceId: string;
  userId: string;
  authz: AuthzContext;
}

export interface ActorResolver {
  /** Chỉ xác thực user (route không cần workspace: /v1/me, /v1/workspaces, /v1/auth/password/set). */
  user(req: IncomingMessage): Promise<string>;
  /** User + membership của X-Workspace-Id. */
  resolve(req: IncomingMessage): Promise<RequestActor>;
}

export const ACTOR_RESOLVER = Symbol('ACTOR_RESOLVER');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const header = (req: IncomingMessage, k: string) => {
  const v = req.headers[k];
  return Array.isArray(v) ? v[0] : v;
};

export class JwtActorResolver implements ActorResolver {
  constructor(
    private readonly tokens: AccessTokens,
    private readonly workspaces: Pick<WorkspacesService, 'membership'>,
    private readonly authz: Pick<AuthzResolver, 'resolve'>,
    private readonly clock: Clock,
  ) {}

  async user(req: IncomingMessage): Promise<string> {
    const h = header(req, 'authorization');
    const claims = h?.startsWith('Bearer ') ? this.tokens.verify(h.slice(7).trim(), this.clock.now().getTime()) : null;
    if (!claims) throw new AppError('UNAUTHENTICATED', 401);
    return claims.sub;
  }

  async resolve(req: IncomingMessage): Promise<RequestActor> {
    const userId = await this.user(req);
    const workspaceId = header(req, 'x-workspace-id');
    if (!workspaceId || !UUID.test(workspaceId)) throw new AppError('FORBIDDEN', 403, { workspace: 'missing' });
    const m = await this.workspaces.membership(userId, workspaceId);
    if (!m) throw new AppError('FORBIDDEN', 403, { workspace: 'not_member' });
    return { workspaceId, userId, authz: await this.authz.resolve(workspaceId, userId, m) };
  }
}
