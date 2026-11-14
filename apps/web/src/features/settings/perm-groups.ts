// Nhóm quyền của ma trận "Vai trò & phân quyền" (prototype L6011–6027; Blueprint §3.5). Hàng = permission thật trong @appchat/shared,
// cột = 5 vai trò hệ thống. Nhóm OUT của prototype (Gọi điện, Quy trình, Báo cáo) không có.
import type { PermissionKey } from '@appchat/shared';

export const PERM_GROUPS: { key: string; perms: PermissionKey[] }[] = [
  { key: 'assistant', perms: ['assistant.use', 'ai_task.manage', 'approvals.decide'] },
  { key: 'inbox', perms: ['inbox.view', 'inbox.reply', 'inbox.assign', 'inbox.manage', 'inbox.export'] },
  { key: 'crm', perms: ['crm.view', 'crm.edit', 'crm.delete', 'crm.import', 'crm.export', 'crm.reassign', 'crm.fields_manage'] },
  {
    key: 'sales',
    perms: ['catalog.view', 'catalog.manage', 'catalog.cost_view', 'quote.create', 'quote.approve', 'contract.draft', 'contract.sign', 'order.manage', 'order.cancel'],
  },
  { key: 'finance', perms: ['invoice.manage', 'payment.record', 'payment.refund_request', 'payment.refund_approve', 'finance.manage'] },
  { key: 'booking', perms: ['booking.view', 'booking.manage', 'booking.config'] },
  { key: 'support', perms: ['ticket.view', 'ticket.manage', 'sla.manage'] },
  { key: 'marketing', perms: ['campaign.view', 'campaign.manage', 'campaign.approve', 'loyalty.view', 'loyalty.adjust', 'loyalty.config'] },
  { key: 'ai', perms: ['agents.manage', 'kb.manage', 'ai.governance'] },
  {
    key: 'admin',
    perms: ['settings.manage', 'members.manage', 'channels.manage', 'integrations.manage', 'audit.view', 'roles.manage', 'billing.manage', 'privacy.erase'],
  },
];
