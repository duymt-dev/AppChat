// Ngày hôm nay (YYYY-MM-DD, giờ máy người dùng) cho form chứng từ: mock giữ ngày cố định của parity (prototype-parity §4 — 24/06/2026),
// http dùng hook `useToday()` để không đóng băng tại thời điểm nạp bundle (tab mở lúc 23:59 → mở form lúc 00:01 vẫn nhận ngày mới).
'use client';
import { useEffect, useState } from 'react';
import { apiMode } from '../api/transport';

export const MOCK_TODAY = '2026-06-24';

export function todayIso(now: Date = new Date()): string {
  if (apiMode() === 'mock') return MOCK_TODAY;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

function msUntilNextMidnight(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 50);
  return Math.max(1000, next.getTime() - now.getTime());
}

/** Ngày hôm nay tươi theo đồng hồ hiện tại (mock giữ MOCK_TODAY; http cập nhật khi mount, qua 00:00, khi focus / hiện lại tab). */
export function useToday(): string {
  const [today, setToday] = useState(() => todayIso());

  useEffect(() => {
    if (apiMode() === 'mock') return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () =>
      setToday((prev) => {
        const next = todayIso();
        return prev === next ? prev : next;
      });
    const arm = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        refresh();
        arm();
      }, msUntilNextMidnight(new Date()));
    };
    const onVis = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    arm();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return today;
}
