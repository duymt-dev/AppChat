// Ô hỏi của drawer "Trợ lý AI · [module]" (TIP-023c G2.7): giữ nháp, gửi lượt thật qua `useScreenAssistant(module)`; nút nhanh gửi prompt
// soạn sẵn của màn (standard §10). Không có câu trả lời giả — drawer chỉ hiện những gì lượt trả về.
'use client';
import { useState } from 'react';
import { useScreenAssistant } from './useScreenAssistant';

export function useDrawerAsk(module: string) {
  const asst = useScreenAssistant(module);
  const [draft, setDraft] = useState('');
  const send = () => {
    const text = draft.trim();
    if (!text || asst.typing) return;
    setDraft('');
    void asst.send(text);
  };
  return { asst, draft, setDraft, send, ask: (prompt: string) => void asst.send(prompt) };
}
