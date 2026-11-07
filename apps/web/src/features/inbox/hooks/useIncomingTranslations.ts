// Tự dịch tin VÀO sang tiếng Việt (TIP-025b §F.2): chỉ khi bật cho hội thoại đang mở; mỗi lần bật dịch tối đa 10 tin khách đang thấy
// (mới nhất trước), hàng đợi tuần tự; cũ hơn phải bấm "Dịch thêm". Không dịch lại khi luồng tin làm mới (đã có / đang chạy thì bỏ qua);
// lỗi / hết credit → dừng hàng đợi, người bấm thử lại; không bao giờ hiện bản dịch bịa. Nguyên văn luôn còn (bản dịch là dòng phụ).
'use client';
import { useEffect, useRef, useState } from 'react';
import { AUTO_TRANSLATE_INITIAL } from '@appchat/shared';
import { useAction } from '@/shared/actions/useAction';
import type { Message } from '../types';

const translatable = (m: Message) => m.direction === 'in' && m.kind === 'text' && !m.deleted && !m.recalled && !!m.body?.trim();

interface Session {
  key: string;
  texts: Record<string, string>;
  tried: string[];
  budget: number;
  paused: boolean;
}
const fresh = (key: string): Session => ({ key, texts: {}, tried: [], budget: AUTO_TRANSLATE_INITIAL, paused: false });

export function useIncomingTranslations(conversationId: string, messages: Message[], enabled: boolean) {
  const translate = useAction<{ text: string }>('ai.translate');
  // Bật lại / đổi hội thoại = phiên mới (10 tin đầu); kết quả của phiên cũ bị bỏ.
  const key = `${conversationId}:${enabled}`;
  const [st, setSt] = useState<Session>(() => fresh(key));
  const s = st.key === key ? st : fresh(key);
  const inflight = useRef<string | null>(null);
  const live = useRef(key);
  useEffect(() => {
    live.current = key;
  }, [key]);

  const candidates = enabled ? messages.filter(translatable).reverse() : [];
  const next = s.paused ? undefined : candidates.slice(0, s.budget).find((m) => !s.tried.includes(m.id));

  useEffect(() => {
    if (!next || inflight.current) return;
    inflight.current = next.id;
    const id = next.id;
    void translate.run({ conversation_id: conversationId, message_id: id, to: 'vi' }, { silent: true }).then((r) => {
      inflight.current = null;
      if (live.current !== key) return; // phiên đã đổi — bỏ kết quả cũ
      setSt((x) => {
        const cur = x.key === key ? x : fresh(key);
        if (!r) return { ...cur, paused: true };
        return { ...cur, tried: [...cur.tried, id], texts: { ...cur.texts, [id]: r.result.text } };
      });
    });
  }, [next?.id, key]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = (p: Partial<Session>) => setSt((x) => ({ ...(x.key === key ? x : fresh(key)), ...p }));
  return {
    texts: s.texts,
    paused: s.paused,
    /** Còn tin cũ hơn chưa dịch (ngoài ngân sách hiện tại). */
    more: enabled && !s.paused && candidates.length > s.budget,
    loadMore: () => patch({ budget: s.budget + AUTO_TRANSLATE_INITIAL }),
    retry: () => patch({ paused: false }),
  };
}
