// Lọc người nhận realtime theo quyền (outbox §8, rbac-permissions): đúng workspace, đủ permission, bản ghi trong scope.
import { can, type AuthzContext } from '@appchat/shared';
import { inScope } from '../../authz/scope';
import type { RealtimeEnvelope } from './envelope';

export interface SocketIdentity {
  workspaceId: string;
  userId: string;
  authz: AuthzContext;
}

export function allowedFor(s: SocketIdentity, env: RealtimeEnvelope): boolean {
  if (s.workspaceId !== env.ws) return false;
  if (env.exceptUserId && s.userId === env.exceptUserId) return false;
  const r = env.require;
  if (r?.permission && !can(s.authz, r.permission)) return false;
  if (r?.scope && !inScope(s.authz, r.scope.module, r.scope.row, r.scope.fields)) return false;
  return true;
}
