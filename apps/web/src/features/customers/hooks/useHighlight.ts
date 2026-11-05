// Tô sáng khách theo lệnh Trợ lý (REQ-E05b): dòng đang có trên trang → bảng focus dòng đó; chưa tải (trang khác / bị lọc) → mở 360°
// (lấy bản ghi qua API theo scope — không tìm DOM rồi âm thầm bỏ qua). Không phải mutation.
'use client';
import { useEffect } from 'react';
import { useCrmUi } from '../crm-store';
import type { ContactRow } from '../types';

export function useHighlight(rows: readonly ContactRow[], loaded: boolean) {
  const highlight = useCrmUi((s) => s.highlight);
  const onPage = !!highlight && rows.some((r) => r.id === highlight);
  useEffect(() => {
    if (highlight && loaded && !onPage) useCrmUi.getState().set({ detail: highlight });
  }, [highlight, loaded, onPage]);
  return onPage ? highlight : null;
}
