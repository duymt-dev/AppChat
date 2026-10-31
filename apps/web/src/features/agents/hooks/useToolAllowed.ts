// Tool người tạo được cấp cho agent (Blueprint §3.3b): người cấp phải có permission của action — Owner có mọi quyền. Builder khoá
// tool ngoài quyền (server cũng chặn: agent.create / update → 403).
'use client';
import { useCallback } from 'react';
import { getAction } from '@appchat/actions';
import { useAuthz } from '@/shared/authz/useCan';

export function useToolAllowed(): (actionId: string) => boolean {
  const { data } = useAuthz();
  return useCallback(
    (id: string) => {
      if (!data) return false;
      const p = getAction(id)?.permission;
      return data.is_owner || !p || (data.permissions as string[]).includes(p);
    },
    [data],
  );
}
