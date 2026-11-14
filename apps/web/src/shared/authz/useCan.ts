'use client';
import { useQuery } from '@tanstack/react-query';
import type { DataScope, PermissionKey, ScopeModule, SystemRole } from '@appchat/shared';
import { transport } from '../api/client';
import { qk } from '../api/query-keys';

export interface MeAuthz {
  role: SystemRole;
  is_owner: boolean;
  permissions: PermissionKey[];
  scope: Record<ScopeModule, DataScope>;
  team_ids: string[];
}

export const useAuthz = () => useQuery({ queryKey: qk.authz(), queryFn: () => transport.get<MeAuthz>('/me/authz') });

/** UI ẩn / vô hiệu nút theo cùng hàm can() với server (standards/authz). */
export function useCan(p: PermissionKey): boolean {
  const { data } = useAuthz();
  if (!data) return false;
  return data.is_owner || data.permissions.includes(p);
}

export function useScope(module: ScopeModule): DataScope {
  const { data } = useAuthz();
  return data?.scope[module] ?? 'none';
}
