// Mock cửa sổ luồng tin + tìm có trang (TIP-025b §B.1–2) cùng hợp đồng server: tìm có trang theo cursor (vị trí trong danh sách khớp của
// ảnh chụp), `total` đúng, ranges trên chuỗi gốc (foldRanges); cửa sổ quanh tin (tin xoá / thu hồi / không có → 404).
import { ApiRequestError, THREAD_AROUND_MAX, foldRanges } from '@appchat/shared';
import type { MockRoute } from '../routes';

const plainOf = (s: string) => s.replace(/<[^>]+>/g, '');
const notFound = (field: string): never => {
  throw new ApiRequestError(404, { code: 'NOT_FOUND', message: field });
};

const searchPage =
  (id: string): MockRoute =>
  (db, p) => {
    const q = String(p.q ?? '').trim();
    if (!q) throw new ApiRequestError(400, { code: 'VALIDATION_FAILED', message: 'q' });
    const who = String(p.sender ?? 'all');
    const limit = Math.min(50, Number(p.limit ?? 50) || 50);
    const all = (db.inbox.messages[id] ?? [])
      .filter((m) => m.direction && typeof m.body === 'string' && !m.deleted && !m.recalled)
      .map((m) => {
        const body = plainOf(String(m.body));
        const sender = m.direction === 'in' ? 'contact' : m.agent ? 'agent' : 'user';
        return { message_id: m.id, body, sender: sender as 'contact' | 'user' | 'agent', time: String(m.time ?? ''), ranges: foldRanges(body, q) };
      })
      .filter((r) => r.ranges.length && (who === 'all' || r.sender === who));
    const from = Number(p.cursor ?? 0) || 0;
    const page = all.slice(from, from + limit);
    return { data: page, next_cursor: from + limit < all.length ? String(from + limit) : null, total: all.length, snapshot_at: new Date().toISOString() };
  };

const around =
  (id: string, messageId: string): MockRoute =>
  (db) => {
    const list = db.inbox.messages[id] ?? [];
    const i = list.findIndex((m) => m.id === messageId);
    const m = list[i];
    if (!m || m.deleted || m.recalled) notFound('message_id');
    const half = (THREAD_AROUND_MAX - 1) / 2;
    return { data: list.slice(Math.max(0, i - half), i + half + 1), anchor_id: messageId, before_cursor: i > half ? list[i - half]!.id : null, after_cursor: i + half + 1 < list.length ? list[i + half]!.id : null };
  };

/** /conversations/:id/messages/search-page · /conversations/:id/messages/around/:messageId. */
export const inboxThreadParamRoute = (path: string): MockRoute | null => {
  const s = path.match(/^\/conversations\/([^/]+)\/messages\/search-page$/);
  if (s) return searchPage(s[1]!);
  const a = path.match(/^\/conversations\/([^/]+)\/messages\/around\/([^/]+)$/);
  return a ? around(a[1]!, a[2]!) : null;
};
