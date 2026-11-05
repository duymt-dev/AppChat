// Quyền hiệu lực khi agent gọi action (Blueprint §3.3b, D51). Agent trực kênh (không người ra lệnh): permission = permission của
// các tool đã cấp, data scope `all` trong hội thoại đang phục vụ (agent-gateway §3). Có người ra lệnh (`delegate` / Cowork):
// ∩ permission + scope của người đó — executor kiểm lại ở MỖI lần gọi tool (không cache cho cả run).
import { AGENT_FIELD_ROLE, SCOPE_MODULES, type AuthzContext, type DataScope, type PermissionKey, type ScopeModule } from '@appchat/shared';
import { grantableAction } from './agent.store';

const ALL = Object.fromEntries(SCOPE_MODULES.map((m) => [m, 'all'])) as Record<ScopeModule, DataScope>;

export function agentAuthz(agent: { id: string; toolIds: readonly string[] }, commander?: AuthzContext): AuthzContext {
  const own = new Set<PermissionKey>();
  for (const id of agent.toolIds) {
    const p = grantableAction(id)?.permission;
    if (p && p !== 'self' && p !== 'platform_admin') own.add(p);
  }
  // Quyền TRƯỜNG (TIP-045b annex C): không người ra lệnh → vai trò `agent` (chỉ trường AI không giới hạn vai trò, không bao giờ Owner).
  if (!commander) return { userId: agent.id, isOwner: false, permissions: own, scope: { ...ALL }, teamIds: [], roleKey: AGENT_FIELD_ROLE };
  const permissions = new Set([...own].filter((p) => commander.isOwner || commander.permissions.has(p)));
  // Scope của agent là `all` → giao = scope người ra lệnh.
  const scope = commander.isOwner ? { ...ALL } : { ...commander.scope };
  // Có người ra lệnh → vai trò trường của người đó (Owner giữ `owner`, không phải toàn quyền tool).
  const roleKey = commander.isOwner ? 'owner' : (commander.roleKey ?? AGENT_FIELD_ROLE);
  return { userId: commander.userId, isOwner: false, permissions, scope, teamIds: commander.teamIds, roleKey, ...(commander.teamUserIds ? { teamUserIds: commander.teamUserIds } : {}) };
}
