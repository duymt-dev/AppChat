// Nháp / gợi ý AI phụ thuộc nguồn tri thức (TIP-020c) — mirror `ai/kb/scope/draft-binding.ts`: hội thoại có nháp AI chiếu `ai_draft_ref`,
// gợi ý copilot chiếu `ref` (thế hệ 0); `message.send` kèm ref lệch / nguồn đã thu hồi → 409. Mock "thu hồi nguồn" = `kb.refresh_source`
// (nạp lại đổi thế hệ) làm nháp AI đang có hết hiệu lực. Tách khỏi `inbox.ts` (trần 400).
import { ApiRequestError, type AiCitationsDto } from '@appchat/shared';
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

/**
 * TIP-020d: nguồn đã kiểm (mock) — đoạn được chống đỡ = cụm chữ cố định trong nháp / gợi ý mẫu, vị trí theo điểm mã của chữ thuần (bỏ
 * `<b>`), như server `citationsOf`. Câu không có cụm mẫu → không có trích dẫn.
 */
const CITED: { phrase: string; source_id: string; name: string; heading: string | null }[] = [
  { phrase: 'Vietcombank · 0071 000 888 999 · CÔNG TY TNHH HƯƠNG SEN', source_id: '0190f000-0000-7000-8000-00000000d0a1', name: 'Thông tin thanh toán.pdf', heading: 'Tài khoản nhận tiền' },
  { phrase: 'khung 14:00', source_id: '0190f000-0000-7000-8000-00000000d0a2', name: 'Lịch trống tuần này', heading: null },
];

export function mockCitations(conversationId: string, text: string | undefined, generation: number): AiCitationsDto | undefined {
  if (!text) return undefined;
  const plain = text.replace(/<\/?b>/g, '');
  const entries = CITED.flatMap((c) => {
    const at = plain.indexOf(c.phrase);
    if (at < 0) return [];
    const start = Array.from(plain.slice(0, at)).length;
    return [{ source_id: c.source_id, name: c.name, heading: c.heading, claim_start: start, claim_end: start + Array.from(c.phrase).length }];
  });
  return { answer: { run_id: runOf(conversationId), generation }, state: entries.length ? 'validated' : 'none', entries };
}

/** Chi tiết hội thoại: nháp AI kèm nguồn đã kiểm (chỉ chi tiết, như server `get`). */
export const withDraftCitations = <T extends { id: string; ai_draft?: string; ai_draft_ref?: Ref }>(c: T | null) =>
  c && c.ai_draft && c.ai_draft_ref ? { ...c, ai_draft_citations: mockCitations(c.id, c.ai_draft, c.ai_draft_ref.generation) } : c;

/** Gợi ý copilot kèm ref (thế hệ 0) + nguồn đã kiểm; đã thu hồi → không chiếu gợi ý. */
export function suggestionWithRef(db: MockDb, conversationId: string, s: unknown): unknown {
  if (!s) return null;
  if (db.inbox.revokedDrafts.includes(conversationId)) return null;
  return { ...(s as object), ref: { id: runOf(conversationId), generation: 0 }, citations: mockCitations(conversationId, (s as { text?: string }).text, 0) };
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
