// Kiểm tra trùng (TIP-015e §1.3): đọc ứng viên thật GET /contacts/duplicates/candidates (scope hiện tại, hạng LUẬT — không %, cursor
// "Xem thêm"), tìm theo tên / email (Enter / nút Kiểm tra), giữ lựa chọn cặp + bản chính. Gộp chỉ gửi cặp đã chọn theo bản chính người dùng
// chọn (`<chính>~<phụ>`), không bao giờ gửi mọi dòng. Đổi tìm → bỏ chọn cũ. 409 → giữ lựa chọn, tải lại để xem trước lại (không tự thử lại).
import { useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import type { DuplicateCandidate } from '@appchat/shared';
import { transport } from '@/shared/api/client';
import { useAction } from '@/shared/actions/useAction';

type Page = { data: DuplicateCandidate[]; next_cursor: string | null };
export const dedupeKey = (q: string) => ['crm', 'duplicates', 'candidates', q] as const;

/** `<chính>~<phụ>` theo bản chính đang chọn của cặp. */
export const groupId = (c: DuplicateCandidate, primary: string) => (primary === c.a.id ? `${c.a.id}~${c.b.id}` : `${c.b.id}~${c.a.id}`);

export function useDedupe() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState('');
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [primary, setPrimary] = useState<Record<string, string>>({});
  const [conflict, setConflict] = useState(false);
  const merge = useAction<{ merged: number }>('contact.merge');
  const list = useInfiniteQuery({
    queryKey: dedupeKey(q),
    queryFn: ({ pageParam }) => transport.get<Page>('/contacts/duplicates/candidates', { ...(q ? { q } : {}), limit: 20, ...(pageParam ? { cursor: pageParam } : {}) }),
    initialPageParam: '' as string,
    getNextPageParam: (p) => p.next_cursor ?? undefined,
  });
  const rows = list.data?.pages.flatMap((p) => p.data) ?? [];
  const primaryOf = (c: DuplicateCandidate) => primary[c.key] ?? c.primary_id;

  function search() {
    setQ(draft.trim());
    setPicked(new Set());
    setConflict(false);
  }
  const toggle = (key: string) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  const choosePrimary = (key: string, id: string) => setPrimary((p) => ({ ...p, [key]: id }));

  async function run(keys: string[]): Promise<boolean> {
    const chosen = rows.filter((c) => keys.includes(c.key));
    if (!chosen.length) return false;
    setConflict(false);
    const r = await merge.run(
      { group_ids: chosen.map((c) => groupId(c, primaryOf(c))) },
      {
        onError: (e) => {
          if (e.status !== 409) return false;
          setConflict(true);
          return true;
        },
      },
    );
    await qc.invalidateQueries({ queryKey: ['crm'] });
    if (r) setPicked((s) => new Set([...s].filter((k) => !keys.includes(k))));
    return !!r;
  }

  return {
    draft,
    setDraft,
    q,
    search,
    rows,
    loading: list.isLoading,
    error: list.isError,
    more: list.hasNextPage,
    loadMore: () => void list.fetchNextPage(),
    picked,
    toggle,
    primaryOf,
    choosePrimary,
    conflict,
    pending: merge.isPending,
    mergeOne: (key: string) => run([key]),
    mergePicked: () => run([...picked]),
  };
}
