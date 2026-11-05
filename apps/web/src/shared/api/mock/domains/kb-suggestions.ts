// Mock hàng chờ "AI đã học — chờ duyệt" (TIP-043) — cùng luật server: GET /kb/suggestions?status=&cursor=&limit= (envelope
// `{ data, next_cursor, meta.pending }`), /kb/suggestions/:id; `kb.suggestion.approve` (CAS if_version, chỉ pending, nội dung còn SĐT /
// email → 422 sensitive_data, tạo đúng một tài liệu nguồn "từ hội thoại" kế thừa thư mục) / `reject`. Mock không có liên kết hội thoại gốc.
import { ApiRequestError, KB_SUGGESTION_LIMITS, type KbSuggestionDto } from '@appchat/shared';
import type { MockHandler } from '../handlers';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';
import { inheritVisibility } from './kb-folders';

type Status = KbSuggestionDto['status'];
const err = (status: number, code: string, fields: Record<string, string>) => new ApiRequestError(status, { code: code as never, message: code, fields });
const PHONE = /(?<!\d)(?:\+?84|0)(?:[\s.-]?\d){8,10}(?!\d)/;
const EMAIL = /[\w.%+-]+@[\w.-]+\.\w{2,}/;

const seed = (id: string, question: string, answer: string, at: string): KbSuggestionDto => ({
  id, question, answer, status: 'pending', edited: false, version: 1, created_at: at, reviewed_at: null, reviewed_by_name: null,
  reject_reason: null, kb_source_id: null, source_status: null, conversation_id: null, source_message_ids: [],
});

export const createKbSuggestionState = (): KbSuggestionDto[] => [
  seed('sg_1', 'Khách có được đổi lịch hẹn không?', 'Khách đổi lịch trước 24 giờ, miễn phí, tối đa 2 lần mỗi liệu trình.', '2026-11-04T09:10:00.000Z'),
  seed('sg_2', 'Spa có chỗ gửi xe không?', 'Có bãi gửi xe máy miễn phí trước cửa; ô tô gửi ở bãi đối diện.', '2026-11-04T08:40:00.000Z'),
  seed('sg_3', 'Có nhận thanh toán bằng thẻ không?', 'Có nhận thẻ ATM nội địa, Visa và Mastercard tại quầy.', '2026-11-03T15:05:00.000Z'),
];

const list = (db: MockDb) => db.kbSuggestions;
function find(db: MockDb, id: string) {
  const s = list(db).find((x) => x.id === id);
  if (!s) throw err(404, 'NOT_FOUND', { suggestion_id: 'not_found' });
  return s;
}
function pending(db: MockDb, id: string, v: number) {
  const s = find(db, id);
  if (s.status !== 'pending') throw err(409, 'CONFLICT', { suggestion_id: s.status });
  if (s.version !== v) throw err(409, 'STALE_VERSION', { version: String(s.version) });
  return s;
}
function clean(field: 'question' | 'answer', v: string) {
  const t = v.trim();
  if (!t) throw err(422, 'VALIDATION_FAILED', { [field]: 'required' });
  if (t.length > KB_SUGGESTION_LIMITS[field]) throw err(422, 'VALIDATION_FAILED', { [field]: 'too_long' });
  if (PHONE.test(t)) throw err(422, 'VALIDATION_FAILED', { [field]: 'sensitive_data:phone' });
  if (EMAIL.test(t)) throw err(422, 'VALIDATION_FAILED', { [field]: 'sensitive_data:email' });
  return t;
}

const page = (db: MockDb, p: Record<string, unknown>) => {
  const status = (p.status as Status | undefined) ?? 'pending';
  const limit = Math.min(Number(p.limit ?? 20) || 20, KB_SUGGESTION_LIMITS.page);
  const all = list(db).filter((s) => s.status === status).sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
  const from = p.cursor ? all.findIndex((s) => s.id === p.cursor) + 1 : 0;
  const data = all.slice(from, from + limit);
  return { data, next_cursor: from + limit < all.length ? data[data.length - 1]!.id : null, meta: { pending: list(db).filter((s) => s.status === 'pending').length } };
};

export const kbSuggestionRoutes: Record<string, MockRoute> = { '/kb/suggestions': page };

export const kbSuggestionParamRoute = (path: string): MockRoute | undefined => {
  const m = path.match(/^\/kb\/suggestions\/([^/]+)$/);
  return m ? (db) => find(db, decodeURIComponent(m[1]!)) : undefined;
};

export const kbSuggestionHandlers: Record<string, MockHandler> = {
  'kb.suggestion.approve': {
    execute: (db, i: { suggestion_id: string; if_version: number; question?: string; answer?: string; folder_id?: string; visibility?: 'public' | 'internal' }) => {
      const s = pending(db, i.suggestion_id, i.if_version);
      const question = clean('question', i.question ?? s.question);
      const answer = clean('answer', i.answer ?? s.answer);
      const visibility = inheritVisibility(db, i.visibility, i.folder_id);
      const id = `kd_sg${++db.settingsAi.seq}`;
      db.settingsAi.kb.docs.unshift({
        id, name: question.slice(0, 120), type: 'txt', tags: [], learned: true, size: '1 KB', source: 'conv', by: 'Bạn', date: new Date().toISOString().slice(0, 10),
        folder_id: i.folder_id ?? null, starred: false, visibility, origin: 'conversation',
      } as never);
      db.settingsAi.kb.nav.all += 1;
      db.settingsAi.kb.nav.conv += 1;
      db.settingsAi.kb.nav.learned += 1;
      Object.assign(s, { status: 'approved', edited: question !== s.question || answer !== s.answer, question, answer, version: s.version + 1, kb_source_id: id, source_status: 'ready', reviewed_at: new Date().toISOString(), reviewed_by_name: 'Bạn' });
      return { suggestion_id: s.id, status: 'approved', kb_source_id: id };
    },
  },
  'kb.suggestion.reject': {
    execute: (db, i: { suggestion_id: string; if_version: number; reason?: string }) => {
      const s = pending(db, i.suggestion_id, i.if_version);
      Object.assign(s, { status: 'rejected', version: s.version + 1, reject_reason: i.reason?.trim() || null, reviewed_at: new Date().toISOString(), reviewed_by_name: 'Bạn' });
      return { suggestion_id: s.id, status: 'rejected' };
    },
  },
};
