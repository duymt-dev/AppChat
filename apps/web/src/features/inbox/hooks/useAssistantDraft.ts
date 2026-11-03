// Nháp AI cho ô soạn Hộp thư (TIP-023c REQ-C05c): soạn / viết lại qua `POST /assistant/messages` + `purpose` — server trả bản đề xuất
// (không lệnh UI, không action). Kết quả gắn hội thoại + phiên bản nháp lúc bấm: nháp đổi trong lúc chờ (người gõ, mẫu, Trợ lý điền) →
// thẻ báo xung đột (chọn thay / chèn / bỏ), không ghi đè; đổi hội thoại → bỏ kết quả cũ, giữ nháp người viết. Chèn / thay chỉ khi người
// bấm; không bao giờ gọi message.send hay đổi chế độ AI.
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AssistantDraftDto } from '@appchat/shared';
import { transport } from '@/shared/api/client';

export type DraftPurpose = 'inbox_compose' | 'inbox_rewrite';
export interface Proposal {
  purpose: DraftPurpose;
  text: string;
  /** Nháp đã đổi sau khi bấm (phiên bản khác) — phải chọn rõ, không tự thay. */
  conflict: boolean;
}

export function useAssistantDraft(convId: string, draft: string, onDraft: (v: string) => void) {
  // Phiên bản nháp: tăng mỗi lần nội dung ô soạn đổi (gửi kèm `base_version`, server trả lại nguyên để so).
  const version = useRef({ text: draft, n: 0 });
  if (version.current.text !== draft) version.current = { text: draft, n: version.current.n + 1 };
  const [proposal, setProposal] = useState<{ purpose: DraftPurpose; text: string; base: number } | null>(null);
  const [pending, setPending] = useState<DraftPurpose | null>(null);
  const [error, setError] = useState(false);
  const live = useRef({ convId, seq: 0 });

  // Đổi hội thoại → huỷ kết quả đang chờ / đề xuất cũ (nháp người viết do store Hộp thư giữ).
  useEffect(() => {
    live.current = { convId, seq: live.current.seq + 1 };
    setProposal(null);
    setPending(null);
    setError(false);
  }, [convId]);

  const ask = useCallback(
    async (purpose: DraftPurpose) => {
      const seq = ++live.current.seq;
      setPending(purpose);
      setError(false);
      try {
        const r = await transport.post<AssistantDraftDto>('/assistant/messages', { purpose, conversation_id: convId, base_version: version.current.n, draft });
        if (live.current.seq !== seq || live.current.convId !== convId || r.conversation_id !== convId) return;
        setProposal({ purpose, text: r.proposed_text, base: r.base_version });
      } catch {
        if (live.current.seq === seq) setError(true);
      } finally {
        if (live.current.seq === seq) setPending(null);
      }
    },
    [convId, draft],
  );

  const shown: Proposal | null = proposal ? { purpose: proposal.purpose, text: proposal.text, conflict: proposal.base !== version.current.n } : null;
  const apply = (how: 'replace' | 'insert') => {
    if (!shown) return;
    onDraft(how === 'replace' ? shown.text : draft ? `${draft}\n${shown.text}` : shown.text);
    setProposal(null);
  };
  return {
    proposal: shown,
    pending,
    error,
    compose: () => void ask('inbox_compose'),
    rewrite: () => void ask('inbox_rewrite'),
    retry: () => void ask(proposal?.purpose ?? (draft.trim() ? 'inbox_rewrite' : 'inbox_compose')),
    replace: () => apply('replace'),
    insert: () => apply('insert'),
    dismiss: () => (setProposal(null), setError(false)),
    cancel: () => {
      live.current.seq++;
      setPending(null);
    },
  };
}
