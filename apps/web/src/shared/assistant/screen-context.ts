// Ngữ cảnh màn cho Trợ lý (REQ-E06, TIP-023c G2.6): mỗi feature đăng ký màn đang mở + bản ghi đang xem (drawer) + dòng đang chọn (DataTable)
// qua hook `useAssistantContext` của chính nó — shared KHÔNG import feature. Lượt Trợ lý (drawer / Dock / màn Trợ lý) đọc ngữ cảnh hiện
// hành ở đây. Chỉ gửi id (≤ 50 dòng chọn, id ≤ 80 ký tự) — không gửi nguyên dòng (có thể chứa ô ẩn); server tự resolve theo scope.
'use client';
import { useEffect } from 'react';
import { create } from 'zustand';
import type { ScreenContext } from './assistant-client';

export const SELECTION_MAX = 50;
const ID_MAX = 80;

export interface ScreenRegistration {
  /** Module của màn (`customers`, `quotes`…) — khoá phiên drawer theo module. */
  module: string;
  route: string;
  entity?: string;
  id?: string | null;
  selection?: readonly string[];
}

interface ScreenContextState {
  current: ScreenRegistration | null;
  set: (r: ScreenRegistration | null) => void;
}

export const useScreenContextStore = create<ScreenContextState>((set) => ({ current: null, set: (current) => set({ current }) }));

const cleanId = (s: string) => s.slice(0, ID_MAX);

/** Ngữ cảnh gửi kèm lượt — đã cắt giới hạn; không có bản ghi → chỉ route. */
export function toTurnContext(r: ScreenRegistration | null, surface: ScreenContext['surface'], fallbackRoute: string): ScreenContext {
  if (!r) return { route: fallbackRoute, ...(surface ? { surface } : {}) };
  const selection = (r.selection ?? []).filter(Boolean).slice(0, SELECTION_MAX).map(cleanId);
  return {
    route: r.route,
    // `entity` đi kèm cả khi chỉ có dòng chọn (không mở bản ghi) — thiếu nó server không biết kiểm dòng chọn bằng action get nào.
    ...(r.entity && (r.id || selection.length) ? { entity: r.entity.slice(0, 40) } : {}),
    ...(r.entity && r.id ? { id: cleanId(r.id) } : {}),
    ...(r.entity && selection.length ? { selection } : {}),
    ...(surface ? { surface } : {}),
  };
}

/** Ngữ cảnh hiện hành (đọc ngoài React — lúc gửi lượt). */
export const currentScreen = () => useScreenContextStore.getState().current;

/**
 * Feature đăng ký ngữ cảnh màn của mình. Đổi bản ghi / dòng chọn → cập nhật; rời màn (unmount) → xoá nếu vẫn là của màn này (không xoá
 * nhầm màn mới đã đăng ký trước khi màn cũ unmount).
 */
export function useRegisterScreenContext(r: ScreenRegistration) {
  const { module, route, entity, id } = r;
  const selKey = (r.selection ?? []).join('\u0001');
  useEffect(() => {
    const reg: ScreenRegistration = { module, route, ...(entity ? { entity } : {}), ...(id ? { id } : {}), ...(selKey ? { selection: selKey.split('\u0001') } : {}) };
    useScreenContextStore.getState().set(reg);
    return () => {
      if (useScreenContextStore.getState().current?.module === module) useScreenContextStore.getState().set(null);
    };
  }, [module, route, entity, id, selKey]);
}
