// Drawer chi tiết kết nối (TIP-012b P3): chi tiết + log phân trang + "Đồng bộ ngay". Lượt kéo đang chờ / chạy → thăm lại 3 giây tới khi
// xong (accepted ≠ finished — không báo thành công khi mới nhận việc). Sự kiện realtime `integration.*` cũng làm mới qua invalidation.
'use client';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useAction } from '@/shared/actions/useAction';
import { connectionDetailQuery, connectionLogsQuery } from '../integration-api';

export function useIntegrationDetail(id: string | null) {
  const detail = useQuery({
    ...connectionDetailQuery(id ?? ''),
    enabled: !!id,
    refetchInterval: (q) => (q.state.data?.pending_call ? 3000 : false),
  });
  const logs = useInfiniteQuery({ ...connectionLogsQuery(id ?? ''), enabled: !!id, refetchInterval: detail.data?.pending_call ? 3000 : false });
  const sync = useAction('integration.sync_now');
  const syncNow = () => (id && detail.data ? sync.run({ connection_id: id, if_version: detail.data.credential_rev }) : Promise.resolve(null));
  // TIP-012b P5 §5.2: bật đối soát tiền trên kết nối đã lưu (finance.manage) — dùng khoá đã lưu, không nhập lại.
  const bind = useAction('bank_feed.connect');
  const bindFeed = () => (id && detail.data ? bind.run({ provider: detail.data.connector_key as 'sepay' | 'casso', connection_id: id, if_version: detail.data.credential_rev }) : Promise.resolve(null));
  return { detail, logs, calls: logs.data?.pages.flatMap((p) => p.data) ?? [], syncNow, syncing: sync.isPending, bindFeed, binding: bind.isPending };
}
