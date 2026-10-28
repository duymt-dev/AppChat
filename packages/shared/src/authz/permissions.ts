// Danh mục permission — nguồn sự thật cho web, core, ai (Blueprint §3.5, standards/authz/rbac-permissions.md).
export const PERMISSIONS = [
  'inbox.view', 'inbox.reply', 'inbox.assign', 'inbox.manage', 'inbox.export',
  'crm.view', 'crm.edit', 'crm.delete', 'crm.import', 'crm.export', 'crm.reassign', 'crm.fields_manage',
  'privacy.erase',
  'catalog.view', 'catalog.manage', 'catalog.cost_view', 'stock.adjust',
  'quote.view', 'quote.create', 'quote.send', 'quote.approve',
  'contract.view', 'contract.draft', 'contract.review', 'contract.sign',
  'documents.manage',
  'order.view', 'order.manage', 'order.cancel',
  'invoice.manage', 'payment.record', 'payment.refund_request', 'payment.refund_approve', 'finance.manage',
  'package.manage',
  'booking.view', 'booking.manage', 'booking.config',
  'ticket.view', 'ticket.manage', 'sla.manage',
  'campaign.view', 'campaign.manage', 'campaign.approve',
  'loyalty.view', 'loyalty.adjust', 'loyalty.config',
  'assistant.use', 'ai_task.manage', 'agents.manage', 'kb.manage', 'approvals.decide', 'ai.governance',
  'insights.view',
  'settings.manage', 'members.manage', 'channels.manage', 'integrations.manage', 'audit.view',
  'roles.manage', 'billing.manage', 'workspace.transfer_ownership',
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number];

export const SCOPE_MODULES = ['inbox', 'crm', 'sales', 'booking', 'support', 'insights'] as const;
export type ScopeModule = (typeof SCOPE_MODULES)[number];
export type DataScope = 'own' | 'team' | 'all' | 'none';

export interface AuthzContext {
  userId: string;
  isOwner: boolean;
  permissions: ReadonlySet<PermissionKey>;
  scope: Record<ScopeModule, DataScope>;
  teamIds: string[];
}

export const can = (ctx: AuthzContext, p: PermissionKey): boolean => ctx.isOwner || ctx.permissions.has(p);
