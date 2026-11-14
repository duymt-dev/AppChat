// Harness role-isolation (rbac-permissions §9): dựng AuthzContext THẬT qua AuthzResolver cho từng thành viên của workspace
// harness, rồi chạy truy vấn list có `scopeFilter` để so tập id nhìn thấy. TIP domain (015 CRM, 016 inbox, 029 sales…)
// dùng lại: tạo bản ghi của từng người + gọi `visible(...)` với query của repo thật.
import { AuthzResolver, type MembershipInput } from '@appchat/core';
import type { AuthzContext } from '@appchat/shared';
import type { Harness } from './setup';

export interface Actor {
  id: string;
  token: string;
  authz: AuthzContext;
}

export async function actorFor(h: Harness, userId: string, token: string): Promise<Actor> {
  const m = await h.platform.membership.findUniqueOrThrow({ where: { workspaceId_userId: { workspaceId: h.ws, userId } } });
  const membership: MembershipInput = { roleKey: m.roleKey, delegations: m.delegations };
  return { id: userId, token, authz: await h.app.get(AuthzResolver).resolve(h.ws, userId, membership) };
}

/** Thành viên mới với vai trò + AuthzContext thật. */
export async function newActor(h: Harness, role: string): Promise<Actor> {
  const u = await h.member(role);
  return actorFor(h, u.id, u.token);
}

/** Tập id nhìn thấy — `query` nhận AuthzContext, trả danh sách bản ghi `{ id }` (đã áp scopeFilter như repo). */
export async function visible(actor: Actor, query: (authz: AuthzContext) => Promise<{ id: string }[]>): Promise<string[]> {
  return (await query(actor.authz)).map((r) => r.id).sort();
}
