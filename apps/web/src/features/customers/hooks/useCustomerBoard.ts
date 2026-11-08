// Kanban Khách hàng phân trang theo cột (TIP-026b §4.2–4.3): trang đầu từ `/contacts/board`, "Tải thêm" từng cột độc lập qua
// `/contacts/board/:stage?cursor=` (gộp, bỏ trùng theo id). Đổi bộ lọc / sắp xếp → reset (key query mới). Kéo thẻ gửi `if_version` của
// thẻ; 409 → báo + làm mới cả bảng (cột thật trên server), không đếm lạc quan khi chưa xác nhận.
'use client';
import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { useTranslations } from 'next-intl';
import type { ApiRequestError } from '@appchat/shared';
import { transport } from '@/shared/api/client';
import { useAction } from '@/shared/actions/useAction';
import { contactParams, contactsBoardQuery, type ContactFilter } from '../api';
import type { ContactRow } from '../types';

type Extra = Record<string, { rows: ContactRow[]; cursor: string | null; loading: boolean; error: boolean }>;

export function useCustomerBoard(filter: ContactFilter, enabled: boolean) {
  const t = useTranslations('customers.kanban');
  const { message } = App.useApp();
  const qc = useQueryClient();
  const board = useQuery({ ...contactsBoardQuery(filter), enabled });
  const setStage = useAction<{ stage: string; version?: number }>('contact.set_stage');
  // Trang thêm gắn với lần tải trang đầu: dữ liệu trang đầu đổi (lọc / sắp xếp / làm mới) → bỏ trang thêm cũ.
  const [extra, setExtra] = useState<{ at: number; cols: Extra }>({ at: 0, cols: {} });
  const cols = useMemo(() => (extra.at === board.dataUpdatedAt ? extra.cols : {}), [extra, board.dataUpdatedAt]);

  const columns = useMemo(
    () =>
      (board.data?.columns ?? []).map((c) => {
        const more = cols[c.key];
        const seen = new Set(c.rows.map((r) => r.id));
        const rows = [...c.rows, ...(more?.rows ?? []).filter((r) => !seen.has(r.id))];
        return { ...c, rows, next_cursor: more ? more.cursor : (c.next_cursor ?? null), loading: !!more?.loading, error: !!more?.error };
      }),
    [board.data, cols],
  );

  const loadMore = useCallback(
    async (stage: string) => {
      const col = columns.find((c) => c.key === stage);
      if (!col?.next_cursor || col.loading) return;
      const at = board.dataUpdatedAt;
      const patch = (p: Partial<Extra[string]>) =>
        setExtra((e) => {
          const base = e.at === at ? e.cols : {};
          const cur = base[stage] ?? { rows: [], cursor: col.next_cursor, loading: false, error: false };
          return { at, cols: { ...base, [stage]: { ...cur, ...p } } };
        });
      patch({ loading: true, error: false });
      try {
        const r = await transport.get<{ data: ContactRow[]; next_cursor: string | null }>(`/contacts/board/${stage}`, { ...contactParams({ ...filter, stage: 'all' }), cursor: col.next_cursor });
        setExtra((e) => {
          const base = e.at === at ? e.cols : {};
          const cur = base[stage] ?? { rows: [], cursor: null, loading: false, error: false };
          return { at, cols: { ...base, [stage]: { rows: [...cur.rows, ...r.data], cursor: r.next_cursor, loading: false, error: false } } };
        });
      } catch {
        patch({ loading: false, error: true });
      }
    },
    [columns, board.dataUpdatedAt, filter],
  );

  const move = useCallback(
    async (row: ContactRow, to: string) => {
      await setStage.run(
        { contact_id: row.id, stage: to, ...(row.version !== undefined ? { if_version: row.version } : {}) },
        {
          onError: (e: ApiRequestError) => {
            if (e.error.code !== 'STALE_VERSION') return false;
            message.warning(t('stale'));
            void qc.invalidateQueries({ queryKey: ['crm', 'board'] });
            return true;
          },
        },
      );
    },
    [setStage, message, t, qc],
  );

  return { board, columns, rows: columns.flatMap((c) => c.rows), loadMore, move, moving: setStage.isPending };
}
