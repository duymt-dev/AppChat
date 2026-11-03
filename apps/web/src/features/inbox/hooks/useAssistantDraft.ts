// Nháp AI cho ô soạn Hộp thư (TIP-023c REQ-C05c): soạn / viết lại qua `POST /assistant/messages` + `purpose` — server trả bản đề xuất
// (không lệnh UI, không action). Kết quả gắn hội thoại + phiên bản nháp lúc bấm (băm nội dung nháp): nháp đổi trong lúc chờ (người gõ,
// mẫu, Trợ lý điền) → thẻ báo xung đột (chọn thay / chèn / bỏ), không ghi đè; đổi hội thoại → kết quả cũ không hiện, nháp người viết giữ
// nguyên. Chèn / thay chỉ khi người bấm; không bao giờ gọi message.send hay đổi chế độ AI.
'use client';
import { useCallback, useRef, useState } from 'react';
import type { AssistantDraftDto } from '@appchat/shared';
import { transport } from '@/shared/api/client';

export type DraftPurpose = 'inbox_compose' | 'inbox_rewrite';
export interface Proposal {
  purpose: DraftPurpose;
  text: string;
  /** Nháp đã đổi sau khi bấm (phiên bản khác) — phải chọn rõ, không tự thay. */
  conflict: boolean;
}

/** Phiên bản nháp = FNV-1a 31 bit của nội dung (không âm) — server trả lại nguyên `base_version` để so. */
export function draftVersion(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return (h >>> 0) & 0x7fffffff;
}

type Pending = { conv: string; purpose: DraftPurpose };
type Result = { conv: string; purpose: DraftPurpose; text: string; base: number };

export function useAssistantDraft(convId: string, draft: string, onDraft: (v: string) => void) {
  const [proposal, setProposal] = useState<Result | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Lần hỏi mới nhất — kết quả của lần cũ hơn (hoặc đã huỷ) bị bỏ. Chỉ đọc / ghi trong handler, không trong render.
  const seq = useRef(0);

  const ask = useCallback(
    async (purpose: DraftPurpose) => {
      const mine = ++seq.current;
      setPending({ conv: convId, purpose });
      setError(null);
      try {
        const r = await transport.post<AssistantDraftDto>('/assistant/messages', { purpose, conversation_id: convId, base_version: draftVersion(draft), draft });
        if (seq.current === mine && r.conversation_id === convId) setProposal({ conv: convId, purpose, text: r.proposed_text, base: r.base_version });
      } catch {
        if (seq.current === mine) setError(convId);
      } finally {
        if (seq.current === mine) setPending(null);
      }
    },
    [convId, draft],
  );

  // Chỉ hiện kết quả / trạng thái của hội thoại đang mở (đổi hội thoại = bỏ kết quả cũ, không cần effect).
  const own = proposal && proposal.conv === convId ? proposal : null;
  const shown: Proposal | null = own ? { purpose: own.purpose, text: own.text, conflict: own.base !== draftVersion(draft) } : null;
  const apply = (how: 'replace' | 'insert') => {
    if (!shown) return;
    onDraft(how === 'replace' ? shown.text : draft ? `${draft}\n${shown.text}` : shown.text);
    setProposal(null);
  };
  return {
    proposal: shown,
    pending: pending && pending.conv === convId ? pending.purpose : null,
    error: error === convId,
    compose: () => void ask('inbox_compose'),
    rewrite: () => void ask('inbox_rewrite'),
    retry: () => void ask(own?.purpose ?? (draft.trim() ? 'inbox_rewrite' : 'inbox_compose')),
    replace: () => apply('replace'),
    insert: () => apply('insert'),
    dismiss: () => (setProposal(null), setError(null)),
    cancel: () => {
      seq.current++;
      setPending(null);
    },
  };
}
