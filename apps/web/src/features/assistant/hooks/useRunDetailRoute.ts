// Mở chi tiết run từ URL (TIP-020d §3.3): `/assistant?run_id=<UUID>` — từ nhật ký AI / liên kết dán. Chỉ đọc (GET /runs/:id có scope,
// không gọi model / không tạo phiên); id sai dạng bị bỏ qua; đóng chỉ xoá `run_id` (giữ tham số khác); đổi workspace → đóng.
'use client';
import { useCallback, useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMe } from '@/shared/shell/useShellData';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function useRunDetailRoute() {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const raw = params.get('run_id');
  const runId = raw && UUID.test(raw) ? raw.toLowerCase() : null;

  const go = useCallback(
    (id: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (id) next.set('run_id', id);
      else next.delete('run_id');
      const q = next.toString();
      router.replace(q ? `${path}?${q}` : path, { scroll: false });
    },
    [params, path, router],
  );

  const ws = useMe().data?.current_workspace_id;
  const boundWs = useRef(ws);
  useEffect(() => {
    if (ws && boundWs.current && boundWs.current !== ws && raw) go(null);
    boundWs.current = ws;
  }, [ws, raw, go]);

  return { runId, open: (id: string) => go(id), close: () => go(null) };
}
