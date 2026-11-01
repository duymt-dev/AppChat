// Loại workspace hiển thị ở menu người dùng (prototype L1300 — Cá nhân / Team / Doanh nghiệp) suy từ gói: phân khúc
// `personal` → personal; gói `team` → team; còn lại (business / ultimate / enterprise) → business. Chưa có gói → personal.
export type WorkspaceKind = 'personal' | 'team' | 'business';

export const WORKSPACE_KIND_COLOR: Record<WorkspaceKind, string> = { personal: '#2563EB', team: '#0E9B7E', business: '#6E48E6' };

export function workspaceKind(plan: { key: string; segment: string } | null | undefined): WorkspaceKind {
  if (!plan || plan.segment === 'personal') return 'personal';
  return plan.key === 'team' ? 'team' : 'business';
}

/** Chữ cái đầu (hoa) của tên — avatar workspace / người dùng. */
export const initialOf = (name: string): string => (name.trim().charAt(0) || '?').toLocaleUpperCase('vi');
