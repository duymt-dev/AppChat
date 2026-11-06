// Trạng thái danh sách có cursor của màn /admin (TIP-040): bộ lọc + chồng cursor (Trang trước / Trang sau) — đổi bộ lọc về trang đầu.
'use client';
import { useState } from 'react';

export function useCursorPage<F extends Record<string, string | undefined>>(initial: F) {
  const [filter, setFilter] = useState<F>(initial);
  const [stack, setStack] = useState<string[]>([]);
  const cursor = stack.at(-1);
  return {
    filter,
    params: { ...filter, ...(cursor ? { cursor } : {}) },
    page: stack.length + 1,
    setFilter: (patch: Partial<F>) => {
      setFilter((f) => ({ ...f, ...patch }));
      setStack([]);
    },
    next: (c: string | null | undefined) => c && setStack((s) => [...s, c]),
    prev: () => setStack((s) => s.slice(0, -1)),
  };
}
