// Thùng rác khách (TIP-015f §5.3–§5.4): đọc GET /contacts/deleted theo trang cursor (mặc định 30) + tìm; khôi phục qua `contact.restore`
// (xác nhận ở màn). 409 → giải thích riêng (quá hạn / trùng SĐT với khách đang dùng / đã thay đổi) và làm mới danh sách — không thử lại mù,
// không đổi người phụ trách / gộp khách khác như tác dụng phụ.
import { useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiRequestError, DeletedContact } from '@appchat/shared';
import { transport } from '@/shared/api/client';
import { useAction } from '@/shared/actions/useAction';

type Page = { data: DeletedContact[]; next_cursor: string | null };
export type RestoreProblem = 'expired' | 'phone_taken' | 'changed' | null;

export const deletedContactsKey = (q: string) => ['crm', 'deleted', q] as const;

/** 409 của khôi phục → lý do hiển thị (không lộ khách khác). */
export function restoreProblem(e: ApiRequestError): RestoreProblem {
  const f = e.error.fields ?? {};
  if (f.contact_id === 'restore_expired') return 'expired';
  if (f.phone === 'taken') return 'phone_taken';
  return e.status === 409 ? 'changed' : null;
}

export function useDeletedContacts(enabled: boolean) {
  const [q, setQ] = useState('');
  const qc = useQueryClient();
  const restore = useAction<{ contact_id: string; version: number }>('contact.restore');
  const [problem, setProblem] = useState<{ id: string; kind: Exclude<RestoreProblem, null> } | null>(null);
  const list = useInfiniteQuery({
    queryKey: deletedContactsKey(q),
    queryFn: ({ pageParam }) => transport.get<Page>('/contacts/deleted', { ...(q.trim() ? { q: q.trim() } : {}), limit: 30, ...(pageParam ? { cursor: pageParam } : {}) }),
    initialPageParam: '' as string,
    getNextPageParam: (p) => p.next_cursor ?? undefined,
    enabled,
  });
  const rows = list.data?.pages.flatMap((p) => p.data) ?? [];

  async function run(c: DeletedContact): Promise<boolean> {
    setProblem(null);
    const r = await restore.run(
      { contact_id: c.id, if_version: c.version },
      {
        onError: (e) => {
          const kind = restoreProblem(e);
          if (!kind) return false;
          setProblem({ id: c.id, kind });
          return true;
        },
      },
    );
    await qc.invalidateQueries({ queryKey: ['crm', 'deleted'] });
    return !!r;
  }

  return { q, setQ, rows, list, restore: run, pending: restore.isPending, problem };
}
