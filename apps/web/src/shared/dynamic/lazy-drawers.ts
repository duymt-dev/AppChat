// Tải lười drawer / modal nặng (TIP-001b §3.1, frontend-structure §13): mã của vùng chỉ tải khi mở lần đầu — không nằm trong JS khởi đầu
// của màn / layout. Nơi dùng khai báo `const X = lazyDrawer(() => import('../components/X').then((m) => m.X))` (đường import tĩnh để
// bundler tách chunk) rồi bọc `<Opened name when={mở}>`: chưa mở thì không mount (không tải chunk). Đang tải → khung skeleton (PageStates
// loading); lỗi render của vùng → PanelBoundary trong khung cố định (Thử lại; có `onClose` thì thêm Đóng) — không làm trắng màn.
'use client';
import { createElement, useState, type ComponentType, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { PanelBoundary } from '../states/PanelBoundary';
import { DrawerSkeleton, useDrawerFrameStyles } from './DrawerSkeleton';

/** Component tải lười, không SSR (drawer / modal chỉ mở trên trình duyệt), fallback skeleton. */
export const lazyDrawer = <P extends object>(load: () => Promise<ComponentType<P>>): ComponentType<P> =>
  dynamic(() => load().then((C) => ({ default: C })), { ssr: false, loading: DrawerSkeleton });

export interface OpenedProps {
  /** Tên vùng cho log / `data-panel` của trạng thái lỗi. */
  name: string;
  when: boolean;
  /** Đóng vùng ở store (nút Đóng của trạng thái lỗi). */
  onClose?: () => void;
  /** false: đóng là gỡ hẳn (component không tự ẩn khi đóng). Mặc định giữ mount sau lần mở đầu (animation đóng / mở, state nội bộ). */
  keep?: boolean;
  children: ReactNode;
}

export function Opened({ name, when, onClose, keep = true, children }: OpenedProps) {
  const [seen, setSeen] = useState(when);
  const { styles } = useDrawerFrameStyles();
  if (when && !seen) setSeen(true);
  if (!(when || (keep && seen))) return null;
  return createElement(PanelBoundary, { name, active: when, onDismiss: onClose, className: styles.frame }, children);
}
