// Trợ lý theo màn (REQ-E06, TIP-023c G2.7): drawer "Trợ lý AI · [module]" / hộp lệnh Hộp thư gửi lượt THẬT (`surface: drawer`, ngữ cảnh
// màn hiện hành) và nhận chữ / thẻ xác nhận / cây GenUI gọn. Một phiên mỗi module (giữ khi đóng / mở lại drawer); "Mở trong Trợ lý"
// chuyển sang màn Trợ lý đầy đủ cùng `session_id`. Lệnh UI chạy qua UI Command Bus; sự kiện phát lại không chạy lại action.
'use client';
import { useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { create } from 'zustand';
import type { ConfirmEventDto, GenUiPart, TurnEventDto, UiCommand } from '@appchat/shared';
import { postConfirm, postTurn, type AssistantMode } from './assistant-client';
import { currentScreen, toTurnContext } from './screen-context';
import { dispatchUiCommand } from './ui-command-bus';

export interface ScreenMsg {
  id: string;
  role: 'user' | 'ai';
  text: string;
  card?: ConfirmEventDto;
  /** `approval`: đã xác nhận nhưng chuyển chờ duyệt — CHƯA thực hiện. */
  status?: 'pending' | 'done' | 'cancelled' | 'approval';
  ui?: GenUiPart;
  /** Lượt lỗi (mạng / máy chủ) — hiện câu lỗi chung, không giả câu trả lời. */
  error?: boolean;
}

interface Thread {
  sessionId?: string;
  msgs: ScreenMsg[];
  typing: boolean;
}

interface ScreenAssistantState {
  threads: Record<string, Thread>;
  patch: (module: string, p: Partial<Thread> | ((t: Thread) => Partial<Thread>)) => void;
  reset: () => void;
}

const EMPTY: Thread = { msgs: [], typing: false };

/** Phiên theo module — reset khi đổi workspace (không lẫn phiên giữa workspace). */
export const useScreenThreads = create<ScreenAssistantState>((set) => ({
  threads: {},
  patch: (module, p) => set((s) => {
    const cur = s.threads[module] ?? EMPTY;
    return { threads: { ...s.threads, [module]: { ...cur, ...(typeof p === 'function' ? p(cur) : p) } } };
  }),
  reset: () => set({ threads: {} }),
}));

let seq = 0;
const mid = () => `sm${Date.now().toString(36)}${seq++}`;

/** Sự kiện của lượt → tin (chữ / thẻ / cây); lệnh UI trả về để caller chạy (chỉ lượt mới — không chạy khi phát lại). */
export function messagesOf(events: readonly TurnEventDto[]): { msgs: ScreenMsg[]; commands: UiCommand[] } {
  const msgs: ScreenMsg[] = [];
  const commands: UiCommand[] = [];
  for (const ev of events) {
    if (ev.type === 'ui_command') commands.push(ev.command as UiCommand);
    else if (ev.type === 'confirm') msgs.push({ id: mid(), role: 'ai', text: '', card: ev, status: 'pending' });
    else if (ev.type === 'delta') {
      const last = msgs.at(-1);
      if (last && last.role === 'ai' && !last.card && !last.ui) last.text += ev.text;
      else msgs.push({ id: mid(), role: 'ai', text: ev.text });
    } else if (ev.type === 'error') msgs.push({ id: mid(), role: 'ai', text: ev.message });
    else if (ev.type === 'ui') msgs.push({ id: mid(), role: 'ai', text: '', ui: ev });
  }
  return { msgs, commands };
}

export function useScreenAssistant(module: string, mode: AssistantMode = 'cowork') {
  const router = useRouter();
  const pathname = usePathname();
  const qc = useQueryClient();
  const thread = useScreenThreads((s) => s.threads[module] ?? EMPTY);
  const patch = useScreenThreads((s) => s.patch);

  const runUi = useCallback(
    (cmd: UiCommand) => {
      if (dispatchUiCommand(cmd)) return;
      if (cmd.type === 'navigate') router.push(cmd.route);
    },
    [router],
  );

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text) return;
      const t = useScreenThreads.getState().threads[module] ?? EMPTY;
      patch(module, (cur) => ({ msgs: [...cur.msgs, { id: mid(), role: 'user', text }], typing: true }));
      try {
        const turn = await postTurn({ text, mode, sessionId: t.sessionId, context: toTurnContext(currentScreen(), 'drawer', pathname) });
        const { msgs, commands } = messagesOf(turn.events);
        patch(module, (cur) => ({ sessionId: turn.session_id, msgs: [...cur.msgs, ...msgs] }));
        commands.forEach(runUi);
      } catch {
        patch(module, (cur) => ({ msgs: [...cur.msgs, { id: mid(), role: 'ai', text: '', error: true }] }));
      } finally {
        patch(module, { typing: false });
      }
    },
    [module, mode, pathname, patch, runUi],
  );

  const decide = useCallback(
    async (m: ScreenMsg, decision: 'confirm' | 'cancel') => {
      if (!m.card) return;
      const res = await postConfirm(m.card.confirm_token, decision);
      const status: ScreenMsg['status'] = res.status === 'done' ? 'done' : res.status === 'approval_required' ? 'approval' : 'cancelled';
      const { msgs } = messagesOf((res.events ?? []).filter((e) => e.type !== 'ui_command'));
      patch(module, (cur) => ({ msgs: [...cur.msgs.map((x) => (x.id === m.id ? { ...x, status } : x)), ...msgs] }));
      if (status === 'approval') await qc.invalidateQueries({ queryKey: ['approvals'] });
      if (status === 'done') await qc.invalidateQueries();
    },
    [module, patch, qc],
  );

  /** "Mở trong Trợ lý": màn Trợ lý đầy đủ nạp lại phiên này (cùng session_id — không gọi model). */
  const openFull = useCallback(() => {
    const sid = (useScreenThreads.getState().threads[module] ?? EMPTY).sessionId;
    router.push(sid ? `/assistant?thread=${encodeURIComponent(sid)}` : '/assistant');
  }, [module, router]);

  return { ...thread, send, decide, openFull, runUi, reset: () => patch(module, { msgs: [], sessionId: undefined, typing: false }) };
}
