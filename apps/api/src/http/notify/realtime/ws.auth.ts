// Xác thực handshake Socket.IO `/ws` (Blueprint §4.6): `auth: { token, workspace_id }` (hoặc header Authorization +
// X-Workspace-Id) → JWT access + membership active + AuthzContext — cùng đường kiểm như HTTP (JwtActorResolver).
import type { IncomingMessage } from 'node:http';
import { AppError } from '@appchat/shared';
import type { SocketIdentity } from '@appchat/core';
import type { ActorResolver } from '../../kernel/request-actor';

export interface HandshakeLike {
  auth: Record<string, unknown>;
  headers: IncomingMessage['headers'];
}

/** Dựng request giả cho ActorResolver từ handshake (token / workspace trong `auth` ưu tiên hơn header). */
export function handshakeRequest(h: HandshakeLike): IncomingMessage {
  const token = typeof h.auth.token === 'string' ? h.auth.token : undefined;
  const ws = typeof h.auth.workspace_id === 'string' ? h.auth.workspace_id : undefined;
  return {
    headers: {
      ...h.headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(ws ? { 'x-workspace-id': ws } : {}),
    },
  } as IncomingMessage;
}

export async function authenticate(actors: ActorResolver, h: HandshakeLike): Promise<SocketIdentity> {
  const a = await actors.resolve(handshakeRequest(h));
  return { workspaceId: a.workspaceId, userId: a.userId, authz: a.authz };
}

/** Lỗi handshake → `connect_error` với `data: { code }` (client dịch qua errors.<CODE>). */
export function connectError(err: unknown): Error & { data: { code: string } } {
  const code = err instanceof AppError ? err.code : 'INTERNAL';
  return Object.assign(new Error(code), { data: { code } });
}
