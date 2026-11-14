// Bố cục Hồ sơ 360° (REQ-F12, M05 — prototype L690–735, L8631–8653, L6397–6415): 3 mẫu hệ thống + gán 5 vai trò mặc định,
// thư viện 13 khối (TIP-033b thêm `packages` — Liệu trình). Seed tenant (TIP-015) và mock FE dùng chung.
import type { SystemRole } from '../authz/roles';

export interface LayoutTabDto {
  key: string;
  label: string;
  enabled: boolean;
  sort: number;
  builtin: boolean;
  blocks: string[];
}

export const LAYOUT_BLOCKS = ['contact', 'fields', 'ticket', 'sla', 'csat', 'careNote', 'quotes', 'orders', 'appts', 'loyalty', 'signals', 'summary', 'packages'] as const;
export type LayoutBlock = (typeof LAYOUT_BLOCKS)[number];

const BUILTIN: [string, string][] = [
  ['overview', 'Tổng quan'],
  ['crm', 'CRM'],
  ['ai', 'AI'],
  ['files', 'Tệp'],
  ['history', 'Lịch sử'],
];

const builtinTabs = (): LayoutTabDto[] => BUILTIN.map(([key, label], sort) => ({ key, label, enabled: true, sort, builtin: true, blocks: [] }));

export const DEFAULT_LAYOUT_ID = 'pl_default';

export const SYSTEM_LAYOUTS: { id: string; name: string; tabs: () => LayoutTabDto[] }[] = [
  { id: DEFAULT_LAYOUT_ID, name: 'Mặc định workspace', tabs: builtinTabs },
  { id: 'pl_cskh', name: 'CSKH', tabs: () => [...builtinTabs(), { key: 'cs', label: 'CSKH', enabled: true, sort: 5, builtin: false, blocks: ['ticket', 'sla', 'csat', 'careNote'] }] },
  {
    id: 'pl_sales',
    name: 'Kinh doanh',
    tabs: () => [
      { key: 'overview', label: 'Tổng quan', enabled: true, sort: 0, builtin: true, blocks: [] },
      { key: 'deals', label: 'Giao dịch', enabled: true, sort: 1, builtin: false, blocks: ['quotes', 'orders', 'appts'] },
      { key: 'crm', label: 'CRM', enabled: true, sort: 2, builtin: true, blocks: [] },
      { key: 'ai', label: 'AI', enabled: true, sort: 3, builtin: true, blocks: [] },
      { key: 'files', label: 'Tệp', enabled: false, sort: 4, builtin: true, blocks: [] },
      { key: 'history', label: 'Lịch sử', enabled: true, sort: 5, builtin: true, blocks: [] },
    ],
  },
];

export const DEFAULT_LAYOUT_ROLES: Record<SystemRole, string> = { owner: 'pl_default', manager: 'pl_default', sales: 'pl_sales', cs: 'pl_cskh', accountant: 'pl_default' };
