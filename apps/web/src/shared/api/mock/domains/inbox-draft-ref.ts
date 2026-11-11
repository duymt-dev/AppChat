// Nháp / gợi ý AI phụ thuộc nguồn tri thức (TIP-020c) — mirror `ai/kb/scope/draft-binding.ts`: hội thoại có nháp AI chiếu `ai_draft_ref`,
// gợi ý copilot chiếu `ref` (thế hệ 0); `message.send` kèm ref lệch / nguồn đã thu hồi → 409. Mock "thu hồi nguồn" = `kb.refresh_source`
// (nạp lại đổi thế hệ) làm nháp AI đang có hết hiệu lực. Tách khỏi `inbox.ts` (trần 400).
import { ApiRequestError } from '@appchat/shared';
import type { MockDb } from '../store';

type Ref = { id: string; generation: number };

/** Run giả của nháp / gợi ý (id cố định theo hội thoại, mờ với FE). */
const runOf = (conversationId: string) => `00000000-0000-4000-8000-${conversationId.replace(/[^0-9a-f]/gi, '').padStart(12, '0').slice(-12)}`;

/** Hội thoại có nháp AI → thêm ref (đã thu hồi → bỏ nháp + ref, như server ẩn nháp hết hiệu lực). */
export function withDraftRef<T extends { id: string; ai_draft?: string }>(db: MockDb, c: T): T & { ai_draft_ref?: Ref } {
  if (!c.ai_draft) return c;
  if (db.inbox.revokedDrafts.includes(c.id)) return { ...c, ai_draft: undefined };
  return { ...c, ai_draft_ref: { id: runOf(c.id), generation: 1 } };
}

/** Gợi ý copilot kèm ref (thế hệ 0); đã thu hồi → không chiếu gợi ý. */
export function suggestionWithRef(db: MockDb, conversationId: string, s: unknown): unknown {
  if (!s) return null;
  if (db.inbox.revokedDrafts.includes(conversationId)) return null;
  return { ...(s as object), ref: { id: runOf(conversationId), generation: 0 } };
}

/** Kiểm `ai_draft_ref` khi gửi: không ref → tin tay; lệch hội thoại → stale; nguồn đã thu hồi → knowledge_revoked. */
export function checkDraftRef(db: MockDb, conversationId: string, ref: Ref | undefined): void {
  if (!ref) return;
  const fail = (why: string) => new ApiRequestError(409, { code: 'INVALID_STATE', message: why, fields: { ai_draft: why } });
  if (ref.id !== runOf(conversationId)) throw fail('stale');
  if (db.inbox.revokedDrafts.includes(conversationId)) throw fail('knowledge_revoked');
}

/** Nạp lại nguồn (mock): mọi nháp / gợi ý AI hiện có hết hiệu lực. */
export function revokeAiDrafts(db: MockDb, ids: readonly string[]): void {
  for (const id of ids) if (!db.inbox.revokedDrafts.includes(id)) db.inbox.revokedDrafts.push(id);
}
