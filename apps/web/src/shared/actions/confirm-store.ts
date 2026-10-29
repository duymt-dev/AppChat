// Hàng chờ xác nhận 202 preview — useAction đẩy vào, ConfirmActionHost hiển thị.
import { create } from 'zustand';
import type { ActionPreview } from '@appchat/actions';

export interface PendingConfirm {
  actionId: string;
  preview: ActionPreview;
  resolve: (ok: boolean) => void;
}

interface ConfirmState {
  pending: PendingConfirm | null;
  ask: (actionId: string, preview: ActionPreview) => Promise<boolean>;
  settle: (ok: boolean) => void;
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  pending: null,
  ask: (actionId, preview) => new Promise<boolean>((resolve) => set({ pending: { actionId, preview, resolve } })),
  settle: (ok) => {
    get().pending?.resolve(ok);
    set({ pending: null });
  },
}));
