// Gửi lượt chat + xác nhận thẻ (Blueprint §4.5). Mock trả cả lượt; backend thật stream SSE — hook không đổi chữ ký.
'use client';
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { confirmTurn, sendTurn } from '../api';
import { useAssistantUi } from '../assistant-store';
import type { ChatMessage } from '../types';

let seq = 0;
const mid = () => `m${Date.now().toString(36)}${seq++}`;

/** Độ trễ "đang soạn" như prototype (omiSend 700ms). */
const TYPING_MS = 700;

export function useAssistantChat() {
  const qc = useQueryClient();
  const router = useRouter();
  const ui = useAssistantUi();

  const send = useCallback(async (raw?: string) => {
      const text = (raw ?? useAssistantUi.getState().draft).trim();
      if (!text) return;
      const { push, set, mode, sessionId } = useAssistantUi.getState();
      push({ id: mid(), role: 'user', text });
      set({ draft: '', typing: true, pop: null });
      const [turn] = await Promise.all([sendTurn(text, mode, sessionId), new Promise((r) => setTimeout(r, TYPING_MS))]);
      for (const ev of turn.events) {
        const m: ChatMessage =
          ev.type === 'confirm' ? { id: mid(), role: 'ai', text: '', card: ev, status: 'pending' } : { id: mid(), role: 'ai', text: ev.text };
        useAssistantUi.getState().push(m);
      }
      useAssistantUi.getState().set({ typing: false, sessionId: turn.session_id });
  }, []);

  const decide = useCallback(
    async (m: ChatMessage, decision: 'confirm' | 'cancel') => {
      if (!m.card) return;
      const res = await confirmTurn(m.card.confirm_token, decision);
      ui.patchMsg(m.id, { status: decision === 'confirm' ? 'done' : 'cancelled' });
      if (decision === 'confirm') await qc.invalidateQueries({ queryKey: ['action-logs'] });
      return res;
    },
    [qc, ui],
  );

  const openResult = useCallback((m: ChatMessage) => m.card && router.push(m.card.route), [router]);

  return { send, decide, openResult };
}
