// 5 vai trò hệ thống seed khi tạo workspace (Blueprint §3.5). Code chỉ kiểm permission, không kiểm tên vai trò.
import { PERMISSIONS, type DataScope, type PermissionKey, type ScopeModule } from './permissions';

export const SYSTEM_ROLES = ['owner', 'manager', 'sales', 'cs', 'accountant'] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];

export interface RoleDef {
  key: SystemRole;
  permissions: readonly PermissionKey[];
  scope: Record<ScopeModule, DataScope>;
}

const OWNER_ONLY: readonly PermissionKey[] = [
  'privacy.erase', 'finance.manage', 'ai.governance', 'roles.manage', 'billing.manage',
  'workspace.transfer_ownership',
  // uỷ quyền: Quản lý chỉ có khi Chủ sở hữu bật (membership.delegations)
  'contract.sign', 'payment.refund_approve',
];

const ALL = { inbox: 'all', crm: 'all', sales: 'all', booking: 'all', support: 'all', insights: 'all' } as const;

export const ROLE_DEFS: Record<SystemRole, RoleDef> = {
  owner: { key: 'owner', permissions: PERMISSIONS, scope: ALL },
  manager: { key: 'manager', permissions: PERMISSIONS.filter((p) => !OWNER_ONLY.includes(p)), scope: ALL },
  sales: {
    key: 'sales',
    permissions: [
      'inbox.view', 'inbox.reply', 'crm.view', 'crm.edit', 'catalog.view',
      'quote.view', 'quote.create', 'quote.send', 'contract.view', 'contract.draft',
      'order.view', 'order.manage', 'order.cancel', 'invoice.manage', 'payment.refund_request', 'package.manage',
      'booking.view', 'booking.manage', 'ticket.view', 'ticket.manage', 'loyalty.view',
      'assistant.use', 'ai_task.manage', 'insights.view',
    ],
    scope: { inbox: 'own', crm: 'own', sales: 'own', booking: 'own', support: 'own', insights: 'own' },
  },
  cs: {
    key: 'cs',
    permissions: [
      'inbox.view', 'inbox.reply', 'crm.view', 'crm.edit', 'catalog.view', 'package.manage',
      'booking.view', 'booking.manage', 'ticket.view', 'ticket.manage', 'loyalty.view',
      'assistant.use', 'ai_task.manage', 'insights.view',
    ],
    scope: { inbox: 'own', crm: 'all', sales: 'none', booking: 'own', support: 'own', insights: 'own' },
  },
  accountant: {
    key: 'accountant',
    permissions: [
      'crm.view', 'catalog.view', 'catalog.cost_view', 'stock.adjust', 'quote.view', 'contract.view',
      'order.view', 'order.manage', 'order.cancel', 'invoice.manage', 'payment.record', 'payment.refund_request',
      'loyalty.view', 'loyalty.adjust', 'assistant.use', 'ai_task.manage', 'insights.view',
    ],
    scope: { inbox: 'none', crm: 'all', sales: 'all', booking: 'none', support: 'none', insights: 'all' },
  },
};

export const authzForRole = (role: SystemRole, userId: string) => ({
  userId,
  isOwner: role === 'owner',
  permissions: new Set(ROLE_DEFS[role].permissions),
  scope: ROLE_DEFS[role].scope,
  teamIds: [] as string[],
});
