// Cấu hình điều hướng — thứ tự rail theo prototype L820–846. Gọi điện / Quy trình / Báo cáo ẩn (D07, D19).
import type { IconName } from '@appchat/ui';
import type { PermissionKey } from '@appchat/shared';

export type NavKey =
  | 'dashboard' | 'assistant' | 'inbox' | 'customers' | 'tickets' | 'marketing' | 'calendar' | 'agents'
  | 'products' | 'quotes' | 'orders' | 'invoices' | 'contracts' | 'loyalty' | 'settings';

export interface NavItem {
  key: NavKey;
  route: string;
  icon: IconName;
  permission?: PermissionKey;
  badge?: 'inbox' | 'tickets' | 'calendar';
  flyout?: 'assistant' | 'crm';
}

export const RAIL_ITEMS: readonly NavItem[] = [
  { key: 'dashboard', route: '/dashboard', icon: 'ic-grid' },
  { key: 'assistant', route: '/assistant', icon: 'ic-spark', permission: 'assistant.use', flyout: 'assistant' },
  { key: 'inbox', route: '/inbox', icon: 'ic-inbox', permission: 'inbox.view', badge: 'inbox' },
  { key: 'customers', route: '/customers', icon: 'ic-users', permission: 'crm.view', flyout: 'crm' },
  { key: 'tickets', route: '/tickets', icon: 'ic-ticket', permission: 'ticket.view', badge: 'tickets' },
  { key: 'marketing', route: '/marketing', icon: 'ic-mega', permission: 'campaign.view' },
  { key: 'calendar', route: '/calendar', icon: 'ic-cal', permission: 'booking.view', badge: 'calendar' },
  { key: 'agents', route: '/agents', icon: 'ic-bot', permission: 'agents.manage' },
];

/** Flyout "Khách hàng & CRM" — prototype L11346 (Hóa đơn → Đề nghị thanh toán). */
export const CRM_ITEMS: readonly NavItem[] = [
  { key: 'customers', route: '/customers', icon: 'ic-users', permission: 'crm.view' },
  { key: 'products', route: '/products', icon: 'ic-box', permission: 'catalog.view' },
  { key: 'quotes', route: '/quotes', icon: 'ic-doc', permission: 'quote.view' },
  { key: 'orders', route: '/orders', icon: 'ic-cart', permission: 'order.view' },
  { key: 'invoices', route: '/invoices', icon: 'ic-doc', permission: 'invoice.manage' },
  { key: 'contracts', route: '/contracts', icon: 'ic-doc', permission: 'contract.view' },
  { key: 'loyalty', route: '/loyalty', icon: 'ic-gift', permission: 'loyalty.view' },
];

const CRM_GROUP = new Set<string>(CRM_ITEMS.map((i) => i.route));

/** Mục rail đang sáng: nhóm CRM sáng mục "Khách hàng". */
export const activeRailKey = (pathname: string): NavKey | null => {
  const base = `/${pathname.split('/')[1] ?? ''}`;
  if (CRM_GROUP.has(base)) return 'customers';
  return RAIL_ITEMS.find((i) => i.route === base)?.key ?? null;
};

/** MobileTabBar < md: Tổng quan · Hộp thư · Trợ lý · Khách hàng · Thêm (Blueprint §7.1). */
export const MOBILE_TABS: readonly NavKey[] = ['dashboard', 'inbox', 'assistant', 'customers'];
