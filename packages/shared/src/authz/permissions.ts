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
  /** Scope ĐỌC theo module (list / get / realtime). */
  scope: Record<ScopeModule, DataScope>;
  /**
   * Scope GHI theo module (TIP-042c): thiếu → bằng `scope`. Không bao giờ rộng hơn scope đọc (ghi luôn kiểm đọc trước). CSKH: crm đọc all,
   * ghi own (Blueprint §3.5).
   */
  writeScope?: Record<ScopeModule, DataScope>;
  /** Nhóm của user — scope `team` = bản ghi có `team_id` thuộc các nhóm này (DC-299). */
  teamIds: string[];
  /** Thành viên các nhóm của user — CHỈ để hiển thị / chọn người; không dùng làm scope (DC-299: scope team theo `team_id` bản ghi). */
  teamUserIds?: readonly string[];
  /**
   * Khoá vai trò hiện tại để xét quyền TRƯỜNG (TIP-045b annex C): resolver điền theo membership; agent trực kênh = `agent`; agent có
   * người ra lệnh = vai trò người đó. Thiếu → quyền trường như agent (fail closed), trừ Owner.
   */
  roleKey?: string;
}

/** Nhóm permission theo module (trang Vai trò & phân quyền, `GET /v1/permissions`) — tiền tố trước dấu chấm. */
export const PERMISSION_GROUPS: Record<string, PermissionKey[]> = PERMISSIONS.reduce<Record<string, PermissionKey[]>>((acc, p) => {
  (acc[p.slice(0, p.indexOf('.'))] ??= []).push(p);
  return acc;
}, {});

/** Quyền Chủ sở hữu bật riêng cho từng Quản lý (Blueprint §3.5 "uỷ quyền", P0 qua `membership.delegations`). */
export const DELEGABLE_PERMISSIONS: readonly PermissionKey[] = ['contract.sign', 'payment.refund_approve'];

export const isPermissionKey = (v: string): v is PermissionKey => (PERMISSIONS as readonly string[]).includes(v);

export const can = (ctx: AuthzContext, p: PermissionKey): boolean => ctx.isOwner || ctx.permissions.has(p);
