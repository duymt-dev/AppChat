// Consumer queue `events` (TIP-043): `conversation.updated` (change status / bulk — đóng một hoặc nhiều hội thoại) → đọc trạng thái THẬT ở
// DB: chỉ `closed` mới xét (archive / hide / open / pending / snoozed không học); chụp mốc tin cuối → job `kb-suggest` jobId
// `kbsug-<hội thoại>-<mốc>` (event lặp / relay chạy lại → một job). `kb.suggestion_approved` → đẩy `kb-ingest` cho nguồn vừa duyệt (lần
// đẩy sau commit của action lỗi vì Redis → event vẫn còn, chạy lại được; jobId `kb-<nguồn>-<seq>` chống nạp hai lần).
import type { TenantDb } from '@appchat/db';
import { kbSuggestionApprovedEvent } from '@appchat/shared';
import type { EventConsumer } from '../../../kernel/events/consumer';
import type { KbIngestQueue } from '../kb.queue';
import type { KbSuggestQueue } from './suggestion.queue';

export const KB_SUGGEST_CONSUMER = 'kb-suggest';
const CLOSING = new Set(['status', 'bulk']);

/** Hội thoại đã đóng → mốc tin cuối (null = không đủ điều kiện). */
export async function closedCutoff(db: Pick<TenantDb, 'conversation' | 'message'>, conversationId: string): Promise<string | null> {
  const c = await db.conversation.findUnique({ where: { id: conversationId }, select: { status: true, kind: true } });
  if (c?.status !== 'closed' || c.kind !== 'direct') return null;
  const last = await db.message.findFirst({ where: { conversationId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true } });
  return last?.id ?? null;
}

export function kbSuggestConsumer(suggest: Pick<KbSuggestQueue, 'push'>, ingest: Pick<KbIngestQueue, 'push'> | null): EventConsumer {
  return {
    name: KB_SUGGEST_CONSUMER,
    topics: ['conversation.updated', 'kb.suggestion_approved'],
    async handle(e, db) {
      if (e.topic === 'kb.suggestion_approved') {
        const p = kbSuggestionApprovedEvent.parse(e.payload);
        if (ingest) await ingest.push(e.workspaceId, [{ id: p.source_id, seq: p.ingest_seq }]);
        return;
      }
      const p = e.payload as { conversation_id?: string; change?: string };
      if (!p.conversation_id || !CLOSING.has(p.change ?? '')) return;
      const cutoff = await closedCutoff(db, p.conversation_id);
      if (cutoff) await suggest.push(e.workspaceId, p.conversation_id, cutoff);
    },
  };
}
