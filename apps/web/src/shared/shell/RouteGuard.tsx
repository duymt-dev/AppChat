// Chặn xem màn module khi vai trò thiếu quyền xem (Blueprint §3.5) — cùng permission với mục rail / flyout CRM.
'use client';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAuthz } from '../authz/useCan';
import { PageStates } from '../states/PageStates';
import { routePermission } from './nav-config';

export function RouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: authz } = useAuthz();
  const p = routePermission(pathname);
  const denied = !!p && !!authz && !authz.is_owner && !authz.permissions.includes(p);
  if (denied) return <PageStates state="no-permission">{null}</PageStates>;
  return children;
}
