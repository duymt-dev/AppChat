// Mock phiên Trợ lý (TIP-023c G2): mỗi lượt POST /assistant/messages ghi vào phiên; GET /assistant/sessions (mới nhất trước, `q` theo
// tiêu đề) và /assistant/sessions/:id/messages (cũ → mới, mỗi phần một bong bóng như server) — "Mở trong Trợ lý" nạp lại phiên của
// drawer mà không gọi model. Trạng thái thẻ đọc lại từ hàng chờ xác nhận hiện hành.
import { ApiRequestError } from '@appchat/shared';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';

type Event = { type: string; text?: string; confirm_token?: string; [k: string]: unknown };
interface Msg {
  id: string;
  role: 'user' | 'ai';
  text: string;
  card?: Event;
  ui?: Event;
}
interface Session {
  id: string;
  title: string;
  mode: string;
  last: string;
  msgs: Msg[];
}

const sessions = new Map<string, Session>();
let seq = 0;
const mid = () => `asm_${++seq}`;

/** Ghi một lượt (câu hỏi + phần trả lời; `ui_command` không thành tin như server). */
export function recordTurn(session: string, mode: string, text: string, events: readonly Event[]) {
  let s = sessions.get(session);
  if (!s) sessions.set(session, (s = { id: session, title: text.slice(0, 80), mode, last: '', msgs: [] }));
  s.last = new Date().toISOString();
  s.msgs.push({ id: mid(), role: 'user', text });
  for (const ev of events) {
    if (ev.type === 'delta') s.msgs.push({ id: mid(), role: 'ai', text: String(ev.text ?? '') });
    else if (ev.type === 'confirm') s.msgs.push({ id: mid(), role: 'ai', text: '', card: ev });
    else if (ev.type === 'ui') s.msgs.push({ id: mid(), role: 'ai', text: '', ui: ev });
  }
}

export const resetSessions = () => sessions.clear();

const statusOf = (db: MockDb, token?: string) => {
  const st = db.assistant.pending.find((p) => p.token === token)?.status;
  return st === 'done' ? 'done' : st === 'cancelled' ? 'cancelled' : 'pending';
};

export const assistantSessionRoutes: Record<string, MockRoute> = {
  '/assistant/sessions': (_db, p) => {
    const q = String(p.q ?? '').trim().toLowerCase();
    const rows = [...sessions.values()].filter((s) => !q || s.title.toLowerCase().includes(q)).sort((a, b) => b.last.localeCompare(a.last));
    return { data: rows.map((s) => ({ id: s.id, title: s.title, mode: s.mode, last_message_at: s.last })), next_cursor: null };
  },
};

export const assistantSessionParamRoute = (path: string): MockRoute | null => {
  const m = path.match(/^\/assistant\/sessions\/([^/]+)\/messages$/);
  if (!m) return null;
  return (db) => {
    const s = sessions.get(decodeURIComponent(m[1]!));
    if (!s) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: 'session' });
    return { data: s.msgs.map((x) => ({ ...x, run_id: null, ...(x.card ? { status: statusOf(db, x.card.confirm_token) } : {}) })), next_cursor: null };
  };
};
