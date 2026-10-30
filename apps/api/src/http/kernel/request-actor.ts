// Người gọi + workspace của request (response-envelope §8: thiếu / sai X-Workspace-Id → 403 TRƯỚC khi mở DB tenant).
// TIP-004 / 005 thay `DevActorResolver` bằng JWT + membership + AuthzContext thật (DC-010). Dev resolver chỉ chạy khi
// NODE_ENV ≠ production và đọc header `X-Dev-User` (uuid) + `X-Dev-Role` (owner|manager|sales|cs|accountant).
import { AppError, ROLE_DEFS, type AuthzContext, type PermissionKey } from '@appchat/shared';
import type { IncomingMessage } from 'node:http';

export interface RequestActor {
  workspaceId: string;
  userId: string;
  authz: AuthzContext;
}

export interface ActorResolver {
  resolve(req: IncomingMessage): Promise<RequestActor>;
}

export const ACTOR_RESOLVER = Symbol('ACTOR_RESOLVER');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const header = (req: IncomingMessage, k: string) => {
  const v = req.headers[k];
  return Array.isArray(v) ? v[0] : v;
};

export class DevActorResolver implements ActorResolver {
  /** workspaceId → user được phép (dev / test đăng ký trước; thay cho bảng membership của TIP-004). */
  constructor(private readonly members: Map<string, Set<string>>) {}

  async resolve(req: IncomingMessage): Promise<RequestActor> {
    if (process.env.NODE_ENV === 'production') throw new AppError('UNAUTHENTICATED', 401);
    const userId = header(req, 'x-dev-user');
    if (!userId || !UUID.test(userId)) throw new AppError('UNAUTHENTICATED', 401);
    const workspaceId = header(req, 'x-workspace-id');
    if (!workspaceId || !UUID.test(workspaceId) || !this.members.get(workspaceId)?.has(userId)) {
      throw new AppError('FORBIDDEN', 403, { workspace: 'not_member' });
    }
    const role = (header(req, 'x-dev-role') ?? 'owner') as keyof typeof ROLE_DEFS;
    const def = ROLE_DEFS[role];
    if (!def) throw new AppError('FORBIDDEN', 403, { role: 'unknown' });
    return {
      workspaceId,
      userId,
      authz: {
        userId,
        isOwner: role === 'owner',
        permissions: new Set(def.permissions as readonly PermissionKey[]),
        scope: def.scope,
        teamIds: [],
      },
    };
  }
}
