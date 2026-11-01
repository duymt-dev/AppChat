// Ghép `GET /v1/me` theo shape FE (packages/shared/src/api/identity.ts → meSchema, TIP-011): identity (user, workspaces, vai trò)
// + billing (gói, trial, ví — TIP-009). Ở tầng app để domain identity không phụ thuộc billing.
import { ROLE_NAMES, WORKSPACE_KIND_COLOR, initialOf, isSystemRole, workspaceKind, type MeDto } from '@appchat/shared';
import type { BillingReadService, WorkspacesService } from '@appchat/core';

type Me = Awaited<ReturnType<WorkspacesService['me']>>;
type Billing = Awaited<ReturnType<BillingReadService['forMe']>>;

const roleTitle = (role: string | undefined) => (role && isSystemRole(role) ? ROLE_NAMES[role] : (role?.replace(/^custom:/, '') ?? ''));

export function meView(me: Me, b: Billing): MeDto & Pick<Me, 'needs_declare'> {
  const current = me.workspaces.find((w) => w.id === me.current_workspace_id);
  return {
    // Trường của TIP-004 (avatar_url…) giữ lại cho client cũ; FE đọc theo meSchema.
    user: { ...me.user, phone: me.user.phone ?? '', initial: initialOf(me.user.name), title: roleTitle(current?.role) },
    workspaces: me.workspaces.map((w) => {
      const x = b.workspaces[w.id];
      const kind = workspaceKind(x?.plan_key && x.segment ? { key: x.plan_key, segment: x.segment } : null);
      return { ...w, plan: x?.plan ?? '', trial_ends_at: x?.trial_ends_at ?? null, initial: initialOf(w.name), kind, color: WORKSPACE_KIND_COLOR[kind] };
    }),
    current_workspace_id: me.current_workspace_id,
    needs_declare: me.needs_declare,
    billing: b.billing,
  };
}
