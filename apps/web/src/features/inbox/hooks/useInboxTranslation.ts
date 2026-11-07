// Tuỳ chọn tự dịch theo người + workspace + hội thoại (TIP-025b §F.2): mặc định TẮT, đích tin soạn chọn rõ. Lưu ở trình duyệt người dùng
// (tiện ích hiển thị, không phải dữ liệu nghiệp vụ) — đọc / ghi bọc try/catch, hỏng thì về mặc định tắt.
'use client';
import { useCallback, useSyncExternalStore } from 'react';
import type { TranslateTarget } from '@appchat/shared';
import { useMe } from '@/shared/shell/useShellData';

export interface XlPref {
  auto: boolean;
  to: Exclude<TranslateTarget, 'vi'>;
}

const OFF: XlPref = { auto: false, to: 'en' };
const listeners = new Set<() => void>();
/** Snapshot ổn định cho useSyncExternalStore: cùng chuỗi lưu → cùng object. */
const parsed = new Map<string, XlPref>();
const memory = new Map<string, string>();

const rawOf = (k: string): string => {
  try {
    return window.localStorage.getItem(k) ?? memory.get(k) ?? '';
  } catch {
    return memory.get(k) ?? '';
  }
};
const read = (k: string): XlPref => {
  const raw = rawOf(k);
  if (!raw) return OFF;
  if (!parsed.has(raw)) {
    let v = OFF;
    try {
      v = { ...OFF, ...(JSON.parse(raw) as Partial<XlPref>) };
    } catch {
      v = OFF;
    }
    parsed.set(raw, v);
  }
  return parsed.get(raw)!;
};

export function useXlPref(conversationId: string) {
  const me = useMe().data;
  const key = me ? `inbox.xl:${me.current_workspace_id}:${me.user.id}:${conversationId}` : '';
  const pref = useSyncExternalStore(
    (cb) => (listeners.add(cb), () => listeners.delete(cb)),
    () => (key ? read(key) : OFF),
    () => OFF,
  );
  const set = useCallback(
    (p: Partial<XlPref>) => {
      if (!key) return;
      const raw = JSON.stringify({ ...read(key), ...p });
      memory.set(key, raw);
      try {
        window.localStorage.setItem(key, raw);
      } catch {
        /* trình duyệt chặn lưu — giữ trong phiên */
      }
      listeners.forEach((l) => l());
    },
    [key],
  );
  return { pref, set };
}
