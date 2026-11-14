// Lọc người nhận realtime theo quyền (outbox §8, rbac-permissions): đúng workspace, đủ permission, bản ghi trong scope.
// TIP-042c: `require.record` dùng CÙNG policy đọc với list / get (record-policy) — none chặn trước; quan hệ khách (collaborator / watcher)
// tra DB lúc phát qua `GrantLookup` (một truy vấn mỗi envelope / node), nên gỡ watcher có hiệu lực ngay cả khi payload cũ. Chưa đăng ký
// lookup → coi như không có quan hệ (thu hẹp, không mở rộng).
import { can, type AuthzContext } from '@appchat/shared';
import { inScope } from '../../authz/scope';
import { decide, grantAllows, type ContactGrant } from '../../authz/data-access';
import type { RealtimeEnvelope } from './envelope';
import { runGuard } from './run-guard';

export interface SocketIdentity {
  workspaceId: string;
  userId: string;
  authz: AuthzContext;
}

/** Quan hệ của các user với một khách (workspace, contact, users) → Map user → grant. */
export type GrantLookup = (workspaceId: string, contactId: string, userIds: readonly string[]) => Promise<Map<string, ContactGrant>>;

let lookup: GrantLookup | null = null;
export const registerGrantLookup = (g: GrantLookup | null) => void (lookup = g);

function base(s: SocketIdentity, env: RealtimeEnvelope): boolean {
  if (s.workspaceId !== env.ws) return false;
  if (env.exceptUserId && s.userId === env.exceptUserId) return false;
  const r = env.require;
  if (r?.permission && !can(s.authz, r.permission)) return false;
  if (r?.without && can(s.authz, r.without)) return false;
  if (r?.scope && !inScope(s.authz, r.scope.module, r.scope.row, r.scope.fields)) return false;
  return true;
}

/** Quyết định không cần DB — `grant` = chỉ còn quan hệ khách quyết định (dùng `filterRecipients`). */
function recordDecision(s: SocketIdentity, env: RealtimeEnvelope, grant?: ContactGrant | null): boolean | 'grant' {
  const rec = env.require?.record;
  if (!rec) return true;
  const d = decide(s.authz, rec.policy, 'read', { ...rec.ref, mine: rec.ref.mine || (!!rec.mineUserId && rec.mineUserId === s.userId) }, grant);
  return d === 'grant' && grant !== undefined ? grantAllows(grant, 'read') : d;
}

/** Bộ lọc đồng bộ (không tra quan hệ khách — chỉ đúng khi envelope không có `require.record` cần quan hệ). */
export function allowedFor(s: SocketIdentity, env: RealtimeEnvelope): boolean {
  return base(s, env) && recordDecision(s, env) === true && !env.require?.run;
}

/** Lọc danh sách socket cho một envelope — tra quan hệ khách gom một lần cho những socket cần. */
export async function filterRecipients<T extends SocketIdentity>(list: readonly T[], env: RealtimeEnvelope): Promise<T[]> {
  const pre = list.map((s) => ({ s, d: base(s, env) ? recordDecision(s, env) : false }));
  const need = pre.filter((x) => x.d === 'grant').map((x) => x.s.userId);
  const contact = env.require?.record?.ref.contact;
  const grants = need.length && contact && lookup ? await lookup(env.ws, contact, [...new Set(need)]).catch(() => new Map<string, ContactGrant>()) : new Map<string, ContactGrant>();
  const passed = pre.filter((x) => (x.d === 'grant' ? recordDecision(x.s, env, grants.get(x.s.userId) ?? null) === true : x.d === true)).map((x) => x.s);
  const run = env.require?.run;
  if (!run || !passed.length) return passed;
  // Run AI: quyền đọc run hiện tại (runScope theo người khởi tạo gốc) — một lần mỗi user; chưa có guard / lỗi tra → không gửi.
  const g = runGuard();
  if (!g) return [];
  const byUser = new Map(passed.map((s) => [s.userId, s]));
  const okUsers = new Set<string>();
  await Promise.all([...byUser.values()].map(async (s) => (await g({ workspaceId: s.workspaceId, userId: s.userId, authz: s.authz, runId: run.runId }).catch(() => false)) && okUsers.add(s.userId)));
  return passed.filter((s) => okUsers.has(s.userId));
}
