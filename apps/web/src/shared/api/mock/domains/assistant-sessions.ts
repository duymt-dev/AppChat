// Mock phiên Trợ lý (TIP-023c G2): mỗi lượt POST /assistant/messages ghi vào phiên; GET /assistant/sessions (mới nhất trước, `q` theo
// tiêu đề) và /assistant/sessions/:id/messages (cũ → mới, mỗi phần một bong bóng như server) — "Mở trong Trợ lý" nạp lại phiên của
// drawer mà không gọi model. Trạng thái thẻ đọc lại từ hàng chờ xác nhận hiện hành.
import { ApiRequestError } from '@appchat/shared';

/** Chỉ phần state cần đọc (trạng thái thẻ) — không import store / routes để tránh vòng phụ thuộc mock. */
type Db = { assistant: { pending: { token: string; status: string }[] } };
type Route = (db: Db, params: Record<string, unknown>) => unknown;

type Event = { type: string; text?: string; confirm_token?: string; [k: string]: unknown };
interface Msg {
  id: string;
  role: 'user' | 'ai';
  text: string;
  card?: Event;
  ui?: Event;
  attachment?: { artifact_id: string; name: string; kind: string };
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
export function recordTurn(session: string, mode: string, text: string, events: readonly Event[], files?: readonly { name: string; kind: string }[]) {
  let s = sessions.get(session);
  if (!s) sessions.set(session, (s = { id: session, title: text.slice(0, 80), mode, last: '', msgs: [] }));
  s.last = new Date().toISOString();
  s.msgs.push({ id: mid(), role: 'user', text });
  // Tệp của tin (TIP-023f): mỗi tệp một phần như server — chỉ tên / loại, không nội dung.
  for (const f of files ?? []) s.msgs.push({ id: mid(), role: 'user', text: '', attachment: { artifact_id: '', name: f.name, kind: f.kind } });
  for (const ev of events) {
    if (ev.type === 'delta') s.msgs.push({ id: mid(), role: 'ai', text: String(ev.text ?? '') });
    else if (ev.type === 'confirm') s.msgs.push({ id: mid(), role: 'ai', text: '', card: ev });
    else if (ev.type === 'ui') s.msgs.push({ id: mid(), role: 'ai', text: '', ui: ev });
  }
}

export const resetSessions = () => sessions.clear();

const statusOf = (db: Db, token?: string) => {
  const st = db.assistant.pending.find((p) => p.token === token)?.status;
  return st === 'done' ? 'done' : st === 'cancelled' ? 'cancelled' : 'pending';
};

export const assistantSessionRoutes: Record<string, Route> = {
  // Keyset như server: (last_message_at, id) giảm dần; cursor = vị trí của dòng cuối trang trước.
  '/assistant/sessions': (_db, p) => {
    const q = String(p.q ?? '').trim().toLowerCase();
    const limit = Math.min(Number(p.limit) || 30, 50);
    const key = (s: Session) => `${s.last}|${s.id}`;
    const after = p.cursor ? atob(String(p.cursor)) : null;
    const rows = [...sessions.values()]
      .filter((s) => !q || s.title.toLowerCase().includes(q))
      .sort((a, b) => key(b).localeCompare(key(a)))
      .filter((s) => !after || key(s) < after);
    const page = rows.slice(0, limit);
    return { data: page.map((s) => ({ id: s.id, title: s.title, mode: s.mode, last_message_at: s.last })), next_cursor: rows.length > limit ? btoa(key(page.at(-1)!)) : null };
  },
};

export const assistantSessionParamRoute = (path: string): Route | null => {
  const m = path.match(/^\/assistant\/sessions\/([^/]+)\/messages$/);
  if (!m) return null;
  return (db) => {
    const s = sessions.get(decodeURIComponent(m[1]!));
    if (!s) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: 'session' });
    return { data: s.msgs.map((x) => ({ ...x, run_id: null, ...(x.card ? { status: statusOf(db, x.card.confirm_token) } : {}) })), next_cursor: null };
  };
};
