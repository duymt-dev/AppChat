// Gửi lượt chat + xác nhận thẻ (Blueprint §4.5). Lượt trả JSON một lần `{ session_id, run_id, events }` (DV-006): chữ / thẻ xác nhận /
// lỗi → bong bóng; `ui_command` → UI Command Bus (không có handler → điều hướng). Gửi kèm màn đang mở (`context`) + mức AI.
'use client';
import { useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import type { UiCommand } from '@appchat/actions';
import { dispatchUiCommand } from '@/shared/assistant/ui-command-bus';
import { confirmTurn, sendTurn } from '../api';
import { useAssistantUi } from '../assistant-store';
import type { ChatMessage, TurnEvent } from '../types';

let seq = 0;
const mid = () => `m${Date.now().toString(36)}${seq++}`;

/** Độ trễ "đang soạn" như prototype (omiSend 700ms). */
const TYPING_MS = 700;

/** Route mặc định khi không module nào nhận lệnh (open → màn danh sách của entity). */
const ENTITY_ROUTE: Record<string, string> = { contact: '/customers', quote: '/quotes', order: '/orders', contract: '/contracts', ticket: '/tickets', agent: '/agents', campaign: '/marketing' };

export function useAssistantChat() {
  const qc = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const ui = useAssistantUi();

  const runUi = useCallback(
    (cmd: UiCommand) => {
      if (dispatchUiCommand(cmd)) return;
      if (cmd.type === 'navigate') router.push(cmd.route);
      else if (cmd.type === 'open' && ENTITY_ROUTE[cmd.entity]) router.push(ENTITY_ROUTE[cmd.entity]!);
    },
    [router],
  );

  /** Sự kiện của lượt → bong bóng (chữ / thẻ / lỗi); lệnh UI chạy ngay. */
  const show = useCallback(
    (events: TurnEvent[]) => {
      for (const ev of events) {
        if (ev.type === 'ui_command') runUi(ev.command);
        else if (ev.type === 'confirm') useAssistantUi.getState().push({ id: mid(), role: 'ai', text: '', card: ev, status: 'pending' });
        else if (ev.type === 'delta' || ev.type === 'error') useAssistantUi.getState().push({ id: mid(), role: 'ai', text: ev.type === 'delta' ? ev.text : ev.message });
        else if (ev.type === 'ui') useAssistantUi.getState().push({ id: mid(), role: 'ai', text: '', ui: ev });
      }
    },
    [runUi],
  );

  const send = useCallback(
    async (raw?: string, from?: string) => {
      const text = (raw ?? useAssistantUi.getState().draft).trim();
      if (!text) return;
      const { push, set, mode, sessionId, tier } = useAssistantUi.getState();
      push({ id: mid(), role: 'user', text });
      set({ draft: '', typing: true, pop: null });
      try {
        const [turn] = await Promise.all([sendTurn({ text, mode, sessionId, tier, context: { route: from ?? pathname, surface: 'assistant' }, requestId: `req-${crypto.randomUUID()}` }), new Promise((r) => setTimeout(r, TYPING_MS))]);
        show(turn.events);
        useAssistantUi.getState().set({ sessionId: turn.session_id, ...(mode === 'cowork' && turn.run_id ? { lastRunId: turn.run_id } : {}) });
        if (mode === 'cowork') await qc.invalidateQueries({ queryKey: ['runs'] });
      } finally {
        useAssistantUi.getState().set({ typing: false });
      }
    },
    [pathname, qc, show],
  );

  const decide = useCallback(
    async (m: ChatMessage, decision: 'confirm' | 'cancel') => {
      if (!m.card) return;
      const res = await confirmTurn(m.card.confirm_token, decision);
      // Chuyển sang chờ duyệt (governance) ≠ đã xong: thẻ ghi rõ chưa thực hiện, không mở "Đã lưu vào …".
      const status = res.status === 'done' ? 'done' : res.status === 'approval_required' ? 'approval' : 'cancelled';
      ui.patchMsg(m.id, { status, ...(res.ui_target ? { target: res.ui_target } : {}) });
      if (status === 'approval') await qc.invalidateQueries({ queryKey: ['approvals'] });
      show((res.events ?? []).filter((e) => e.type !== 'ui_command'));
      if (res.status === 'done') await qc.invalidateQueries({ queryKey: ['action-logs'] });
      return res;
    },
    [qc, ui, show],
  );

  /** "Đã lưu vào …" → mở đúng bản ghi vừa tạo (ui_target của action), không có thì màn của module. */
  const openResult = useCallback((m: ChatMessage) => (m.target ? runUi(m.target) : m.card && router.push(m.card.route)), [router, runUi]);

  return { send, decide, openResult, runUi };
}
