// Bản nháp tệp của ô soạn Trợ lý (TIP-023f §1.1, §4.1-4.2): khay sống ngoài popover (đóng menu ＋ không mất tệp). `nonce` bất biến của
// bản nháp (server gắn artifact vào người + nonce trước khi có phiên); đổi sau khi gửi / làm mới. Thế hệ thao tác mỗi tệp nằm ở hook —
// kết quả trễ của thế hệ cũ (đã bỏ / thử lại) không tự gắn lại.
import { create } from 'zustand';
import type { DraftAttachment } from '../input-types';

interface AttachState {
  items: DraftAttachment[];
  nonce: string;
  set: (fn: (xs: DraftAttachment[]) => DraftAttachment[]) => void;
  /** Bỏ hết + nonce mới (sau khi gửi lượt / đổi workspace / phiên mới). */
  renew: () => void;
}

const newNonce = () => crypto.randomUUID();

export const useAttachStore = create<AttachState>((set) => ({
  items: [],
  nonce: newNonce(),
  set: (fn) => set((s) => ({ items: fn(s.items) })),
  renew: () => set({ items: [], nonce: newNonce() }),
}));

export const patchAttachment = (key: string, p: Partial<DraftAttachment>) => useAttachStore.getState().set((xs) => xs.map((x) => (x.key === key ? { ...x, ...p } : x)));

/** Menu ＋ → ô soạn đang mở: chụp màn hình phải bắt đầu NGAY trong cú bấm của người dùng (không qua effect). Ô soạn đăng ký khi mount. */
let captureStarter: (() => void) | null = null;
export function registerCapture(fn: () => void): () => void {
  captureStarter = fn;
  return () => {
    if (captureStarter === fn) captureStarter = null;
  };
}
export const requestCapture = () => captureStarter?.();
