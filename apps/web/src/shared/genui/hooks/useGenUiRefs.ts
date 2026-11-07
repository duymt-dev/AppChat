// Giá trị `$ref` của cây (TIP-023c hợp đồng 5): dùng `refs` đã lọc server phát kèm phần ui; `refresh` hỏi lại `/assistant/ui/refs`
// theo quyền HIỆN HÀNH (mở lại phiên / đổi workspace / thu hồi quyền) — cache theo workspace + run, đổi workspace → khoá khác, không
// dùng giá trị cũ. Không gọi model, không chạy action.
'use client';
import { useQuery } from '@tanstack/react-query';
import { refsOf, type GenUiPart } from '@appchat/shared';
import { transport } from '../../api/client';

export function useGenUiRefs(part: GenUiPart, opts: { workspaceId?: string | null; refresh?: boolean } = {}) {
  const refs = refsOf(part.tree.root);
  const q = useQuery({
    queryKey: ['genui-refs', opts.workspaceId ?? '-', part.run_id, refs],
    queryFn: () => transport.post<Record<string, unknown>>('/assistant/ui/refs', { run_id: part.run_id, refs }),
    enabled: !!opts.refresh && refs.length > 0,
    staleTime: 30_000,
  });
  // Đang hỏi lại → chưa dùng giá trị phát kèm (có thể của quyền cũ); xong → giá trị mới.
  if (opts.refresh) return q.data ?? {};
  return part.refs;
}
