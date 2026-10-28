// UI state của shell (Zustand, Blueprint §7.3): rail mở/thu, popover đang mở, dock Trợ lý.
import { create } from 'zustand';

export type ShellPopover = 'notifications' | 'user' | null;
export type ShellFlyout = { kind: 'assistant' | 'crm'; top: number; left: number } | null;

interface ShellState {
  railExpanded: boolean;
  popover: ShellPopover;
  flyout: ShellFlyout;
  dockOpen: boolean;
  toggleRail: () => void;
  setPopover: (p: ShellPopover) => void;
  togglePopover: (p: Exclude<ShellPopover, null>) => void;
  setFlyout: (f: ShellFlyout) => void;
  setDock: (open: boolean) => void;
}

export const useShellStore = create<ShellState>((set) => ({
  railExpanded: false,
  popover: null,
  flyout: null,
  dockOpen: false,
  toggleRail: () => set((s) => ({ railExpanded: !s.railExpanded })),
  setPopover: (popover) => set({ popover }),
  togglePopover: (p) => set((s) => ({ popover: s.popover === p ? null : p, flyout: null })),
  setFlyout: (flyout) => set({ flyout }),
  setDock: (dockOpen) => set({ dockOpen, popover: null }),
}));
