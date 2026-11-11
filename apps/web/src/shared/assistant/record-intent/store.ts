// Phạm vi bản ghi đang mở theo module (TIP-023g §1.3–1.4): bấm ⚡ / ✦ ở dòng → `open(scope)` (KHÔNG gọi model, không ghi); drawer / tab
// AI đọc phạm vi để gắn lượt. Đổi bản ghi → thế hệ mới, chữ cũ của phạm vi trước không hiện vào bản ghi mới. Đổi workspace → xoá hết.
'use client';
import { create } from 'zustand';
import type { RecordScope } from './types';

interface RecordScopeState {
  ws: string;
  scopes: Record<string, RecordScope>;
  seq: number;
  bindWorkspace: (ws: string) => void;
  open: (s: Omit<RecordScope, 'generation'>) => RecordScope;
  clear: (module: string) => void;
}

export const useRecordScopes = create<RecordScopeState>((set, get) => ({
  ws: '',
  scopes: {},
  seq: 0,
  // Lần gắn đầu ('' → ws) giữ phạm vi vừa mở (bấm dòng xảy ra trước khi khung đọc workspace); chỉ đổi workspace thật mới xoá.
  bindWorkspace: (ws) => set((s) => (s.ws === ws ? s : s.ws === '' ? { ws } : { ws, scopes: {} })),
  open: (s) => {
    const cur = get().scopes[s.module];
    const same = cur && cur.entity === s.entity && cur.id === s.id;
    const scope: RecordScope = { ...s, generation: same ? cur.generation : get().seq + 1 };
    set((st) => ({ seq: same ? st.seq : st.seq + 1, scopes: { ...st.scopes, [s.module]: scope } }));
    return scope;
  },
  clear: (module) =>
    set((st) => ({ scopes: Object.fromEntries(Object.entries(st.scopes).filter(([m]) => m !== module)) })),
}));

export const recordScopeOf = (module: string): RecordScope | null =>
  useRecordScopes.getState().scopes[module] ?? null;

/** Phạm vi bản ghi hiện hành của module (React). */
export const useRecordScope = (module: string): RecordScope | null =>
  useRecordScopes((s) => s.scopes[module] ?? null);
