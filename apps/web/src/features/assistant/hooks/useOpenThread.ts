// "Mở trong Trợ lý" (REQ-E06, TIP-023c G2.7): `/assistant?thread=<session_id>` nạp lại tin của phiên drawer (chữ / thẻ / cây GenUI dựng
// lại theo quyền hiện hành) rồi tiếp tục trên cùng `session_id` — không gọi model, không chạy lại action; bỏ tham số khỏi URL.
'use client';
import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { sessionMessages } from '../api';
import { useAssistantUi } from '../assistant-store';

export function useOpenThread(allowed: boolean) {
  const params = useSearchParams();
  const router = useRouter();
  const thread = params.get('thread');
  const opened = useRef<string | null>(null);
  useEffect(() => {
    if (!thread || !allowed || opened.current === thread) return;
    opened.current = thread;
    void sessionMessages(thread)
      .then((r) => useAssistantUi.getState().set({ messages: r.data.map((m) => ({ id: m.id, role: m.role, text: m.text, card: m.card, status: m.status, ui: m.ui })), sessionId: thread, mode: 'cowork', draft: '' }))
      .catch(() => undefined)
      .finally(() => {
        opened.current = null;
        router.replace('/assistant');
      });
  }, [thread, allowed, router]);
}
