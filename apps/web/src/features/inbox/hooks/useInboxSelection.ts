// Chọn nhiều hội thoại (TIP-025b §C.1): id tường minh từ các trang đã tải, tối đa 100. "Chọn tất cả" = các hàng đang hiện (không bao giờ
// ngầm chọn cả bộ lọc chưa tải). Đổi bộ lọc / workspace → xoá lựa chọn; đổi hội thoại đang mở thì giữ.
'use client';
import { useState } from 'react';
import { BULK_MAX } from '../bulk-types';

export function useInboxSelection(filterKey: string) {
  const [sel, setSel] = useState<{ key: string; ids: string[] }>({ key: filterKey, ids: [] });
  // Lựa chọn gắn với khoá bộ lọc lúc chọn — khoá khác thì coi như rỗng (không cần effect xoá).
  const ids = sel.key === filterKey ? sel.ids : [];
  const setIds = (f: (cur: string[]) => string[]) => setSel((s) => ({ key: filterKey, ids: f(s.key === filterKey ? s.ids : []) }));
  const has = (id: string) => ids.includes(id);
  return {
    ids,
    count: ids.length,
    active: ids.length > 0,
    has,
    toggle: (id: string) => setIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= BULK_MAX ? cur : [...cur, id])),
    selectVisible: (visible: string[]) => setIds((cur) => [...new Set([...cur, ...visible])].slice(0, BULK_MAX)),
    clear: () => setIds(() => []),
  };
}

export type InboxSelection = ReturnType<typeof useInboxSelection>;
