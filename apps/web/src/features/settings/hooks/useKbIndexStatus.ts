// Trạng thái chỉ mục embedding kho tri thức (TIP-020e §4.2): đọc `index` của GET /settings/kb (chung nguồn với bảng tệp — không route
// mới), hỏi lại mỗi 5 giây khi một lần tạo lại đang chạy; khoá truy vấn gắn workspace hiện tại → đổi workspace thì kết quả cũ bị bỏ
// (không hiện tiến độ của workspace khác). Tạo lại / huỷ qua useAction (xem trước bắt buộc ở server — thẻ xác nhận có ước tính).
'use client';
import { useQuery } from '@tanstack/react-query';
import type { KbIndexStatus } from '@appchat/shared';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { kbIndexQuery } from '../api';

export const RUNNING: readonly (KbIndexStatus['phase'] | undefined)[] = ['building', 'catching_up'];

export function useKbIndexStatus() {
  const can = useCan('kb.manage');
  const q = useQuery({ ...kbIndexQuery(), enabled: can });
  const reindex = useAction('kb.reindex');
  const cancel = useAction('kb.reindex_cancel');
  const status = q.data ?? null;
  return {
    status,
    running: RUNNING.includes(status?.phase),
    busy: reindex.isPending || cancel.isPending,
    reindex: () => void reindex.run({}),
    cancel: () => void cancel.run({}),
  };
}
