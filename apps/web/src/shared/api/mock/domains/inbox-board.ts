// Mock TIP-025b P7 cùng hợp đồng server: bảng tin nhóm GET /conversations/:id/group/board?kind=&cursor= (tin ghim + ảnh / tệp / link /
// ghi chú theo trang 24, tách từ tin thật của hội thoại trong mock — không ô màu giả), ứng viên phụ trách GET /conversations/:id/assignees
// (người + agent đang chạy đúng kênh, kèm tải mở; thiếu inbox.assign → 403), lệnh `group.copy_link` (link tắt → enabled false).
import { ApiRequestError, ASSIGNEE_PAGE, authzForRole, can, GROUP_BOARD_KINDS, GROUP_BOARD_PAGE, type AssigneeCandidateDto, type GroupBoardItemDto, type GroupBoardKind } from '@appchat/shared';
import fixture from '../../../../../../../fixtures/prototype-parity/inbox.json';
import members from '../../../../../../../fixtures/prototype-parity/customers.json';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';

const URL_RE = /\bhttps?:\/\/[^\s<>"')]+/gi;
const OPEN = ['open', 'pending', 'snoozed'];
const fail = (status: number, code: 'NOT_FOUND' | 'FORBIDDEN' | 'VALIDATION_FAILED', message: string): never => {
  throw new ApiRequestError(status, { code, message });
};

/** Ảnh mẫu của mock (tệp ảnh nhúng — server trả link ký của tệp thật). */
const thumb = (h: number) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'><defs><linearGradient id='g' x2='1' y2='1'><stop offset='0' stop-color='hsl(${h} 45% 62%)'/><stop offset='1' stop-color='hsl(${h} 40% 46%)'/></linearGradient></defs><rect width='10' height='10' fill='url(#g)'/></svg>`)}`;

/** Mục bảng tin dựng từ fixture nhóm (ảnh / tệp / link) + tin `note` của hội thoại. Ảnh: tên thật, chưa có tệp → không link. */
function itemsOf(db: MockDb, id: string, kind: GroupBoardKind): GroupBoardItemDto[] {
  const g = (fixture.groups as Record<string, (typeof fixture.groups)['g_vip']>)[id];
  const at = '2026-10-24T03:00:00.000Z';
  if (kind === 'notes') return (db.inbox.messages[id] ?? []).filter((m) => m.kind === 'note').reverse().map((m) => ({ message_id: m.id, at, sender: 'Trâm', text: String(m.body) }));
  if (!g) return [];
  if (kind === 'media') return g.media.map(([name, hue], i) => ({ message_id: `${id}-m${i}`, at, sender: 'Trâm', name: String(name), mime: 'image/svg+xml', url: thumb(Number(hue)) }));
  if (kind === 'files') return g.files.map(([ext, name, meta], i) => ({ message_id: `${id}-f${i}`, at, sender: String(meta).split(' · ')[0]!, name, mime: ext === 'PDF' ? 'application/pdf' : `application/${String(ext).toLowerCase()}`, size: 1024 * (i + 1) * 40 }));
  return g.links.flatMap(([title, url], i) => [`https://${url} ${title}`.match(URL_RE)?.[0]].filter(Boolean).map((u) => ({ message_id: `${id}-l${i}`, at, sender: 'Trâm', url: u!, text: title })));
}

const boardRoute =
  (id: string): MockRoute =>
  (db, p) => {
    const c = db.inbox.conversations.find((x) => x.id === id);
    if (!c || c.kind !== 'group') return fail(404, 'NOT_FOUND', 'conversation_id');
    const kind = (p.kind ?? 'media') as GroupBoardKind;
    if (!GROUP_BOARD_KINDS.includes(kind)) return fail(400, 'VALIDATION_FAILED', 'kind');
    const all = itemsOf(db, id, kind);
    const start = p.cursor ? all.findIndex((x) => x.message_id === p.cursor) + 1 : 0;
    const page = all.slice(start, start + GROUP_BOARD_PAGE);
    const g = (fixture.groups as Record<string, { pinned_sub?: string }>)[id];
    return {
      pinned: g?.pinned_sub ? { message_id: `${id}-pin`, at: '2026-10-24T03:00:00.000Z', sender: 'Trâm', text: g.pinned_sub } : null,
      kind,
      items: page,
      next_cursor: start + GROUP_BOARD_PAGE < all.length ? page.at(-1)!.message_id : null,
    };
  };

const assigneesRoute =
  (id: string): MockRoute =>
  (db, p) => {
    if (!can(authzForRole(db.role, 'u_tram'), 'inbox.assign')) return fail(403, 'FORBIDDEN', 'inbox.assign');
    const c = db.inbox.conversations.find((x) => x.id === id);
    if (!c) return fail(404, 'NOT_FOUND', 'conversation_id');
    const q = String(p.q ?? '').trim().toLowerCase();
    const loadOf = (who: string) => db.inbox.conversations.filter((x) => x.assignee === who && OPEN.includes(String(x.status ?? 'open'))).length;
    const people: AssigneeCandidateDto[] = members.members.map((m) => ({ kind: 'user', id: m.id, name: m.name, role: m.role, load: loadOf(m.id), current: c.assignee === m.id }));
    const bots: AssigneeCandidateDto[] = db.agents.agents
      .filter((a) => !a.deleted && a.status === 'active' && a.version > 0 && (!a.channels.length || a.channels.includes(c.channel)))
      .map((a) => ({ kind: 'agent', id: a.id, name: a.name, role: a.role_label, load: loadOf(a.id), current: c.assignee === a.id, version: a.version }));
    const all = [...people, ...bots].filter((x) => !q || x.name.toLowerCase().includes(q));
    const start = Number(p.cursor ?? 0) || 0;
    return { data: all.slice(start, start + ASSIGNEE_PAGE), next_cursor: start + ASSIGNEE_PAGE < all.length ? String(start + ASSIGNEE_PAGE) : null };
  };

/** /conversations/:id/group/board · /conversations/:id/assignees. */
export const inboxBoardParamRoute = (path: string): MockRoute | null => {
  const b = path.match(/^\/conversations\/([^/]+)\/group\/board$/);
  if (b) return boardRoute(b[1]!);
  const a = path.match(/^\/conversations\/([^/]+)\/assignees$/);
  return a ? assigneesRoute(a[1]!) : null;
};
