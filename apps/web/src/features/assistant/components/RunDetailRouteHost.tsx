// Drawer chi tiết run gắn với URL `?run_id=` (TIP-020d §3.3) — mount ở màn Trợ lý AI; việc con mở tiếp đổi `run_id`.
'use client';
import { useRunDetailRoute } from '../hooks/useRunDetailRoute';
import { RunDetailDrawer } from './RunDetailDrawer';

export function RunDetailRouteHost() {
  const r = useRunDetailRoute();
  return <RunDetailDrawer runId={r.runId} onOpen={r.open} onClose={r.close} />;
}
