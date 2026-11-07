// Mock dịch bản nháp (TIP-025b §F.3) như model giả của backend: tiền tố ngôn ngữ đích + nguyên văn, trả lại `draft_revision`; lần hai
// cùng (hội thoại, nội dung, đích) là cache.
import type { MockHandler } from '../handlers';

const seen = new Set<string>();

export const inboxTranslationHandlers: Record<string, MockHandler> = {
  'ai.translate_draft': {
    execute: (_db, i: { conversation_id: string; text: string; to: string; draft_revision: number }) => {
      const k = `${i.conversation_id}|${i.to}|${i.text}`;
      const cached = seen.has(k);
      seen.add(k);
      return { text: `[${i.to.toUpperCase()}] ${i.text}`, to: i.to, draft_revision: i.draft_revision, cached };
    },
  },
};
