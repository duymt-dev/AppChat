// Màn Trợ lý đọc lượt qua SSE (TIP-023c 6a, đóng DV-006): bong bóng AI hiện chữ ngay khi worker ghi delta (không chờ hết lượt); lượt
// xong → thay bằng tin chuẩn (chữ / thẻ / cây) như JSON cũ. Rớt mạng → nối lại theo cursor (shared/assistant/turn-stream). Huỷ khi rời
// màn: chỉ huỷ đăng ký, KHÔNG huỷ run (Dừng = run.cancel).
'use client';
import { useCallback, useEffect, useRef } from 'react';
import type { AssistantTurnDto } from '@appchat/shared';
import { streamTurn } from '@/shared/assistant/turn-stream';
import type { TurnRequest } from '@/shared/assistant/assistant-client';
import type { SkeletonNode } from '@/shared/genui';
import { useAssistantUi } from '../assistant-store';

let seq = 0;
const liveId = () => `live${Date.now().toString(36)}${seq++}`;

export function useAssistantStream() {
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);

  /** Gửi lượt; trong lúc chạy giữ một bong bóng "đang gõ" chứa chữ đã đến, xong thì gỡ (caller hiện tin chuẩn từ kết quả). */
  const run = useCallback(async (q: TurnRequest): Promise<AssistantTurnDto> => {
    abort.current?.abort();
    const ac = new AbortController();
    abort.current = ac;
    const id = liveId();
    let shown = false;
    const ui = useAssistantUi.getState;
    const show = (p: { text?: string; skeleton?: SkeletonNode }) => {
      if (!shown) {
        ui().push({ id, role: 'ai', text: '', live: true, ...p });
        ui().set({ typing: false });
        shown = true;
      } else ui().patchMsg(id, p);
    };
    try {
      return await streamTurn(
        q,
        {
          onText: (text) => show({ text }),
          onSkeleton: (skeleton) => show({ skeleton }),
        },
        ac.signal,
      );
    } finally {
      if (shown) useAssistantUi.setState((s) => ({ messages: s.messages.filter((m) => m.id !== id) }));
    }
  }, []);

  return { run };
}
