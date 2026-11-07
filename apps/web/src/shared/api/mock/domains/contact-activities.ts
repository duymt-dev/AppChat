// Mock hoạt động CRM (TIP-026b) — cùng hợp đồng server: GET /contacts/:id/activities (kind / cursor / limit / activity_id), tóm tắt
// `activities` trong Hồ sơ 360°, 9 action (CAS if_version → 409 STALE_VERSION, undo xoá mềm / huỷ / lưu trữ). Tiền cơ hội: không có
// quote.view → VẮNG `amount_vnd` + `amount_hidden`; ghi tiền thiếu quote.create → 403. Thuần (không import domain khác) — customers.ts nối
// khách thấy / sửa được qua tham số. Seed = prototype L2401–2445 (chị Lan: cơ hội HIFU, 4 việc, ghi chú, 1 bình luận).
import { ApiRequestError, can, authzForRole, taskMoveAllowed, type ActivityKind, type ActivityPageDto, type ActivitySummaryDto, type NoteItemDto, type OpportunityItemDto, type PermissionKey, type SystemRole, type TaskItemDto } from '@appchat/shared';

type Note = Omit<NoteItemDto, 'author'> & { contact_id: string; author_id: string | null; deleted: boolean };
type Task = Omit<TaskItemDto, 'assignee'> & { contact_id: string; assignee_id: string | null; created_at: string };
type Opp = Omit<OpportunityItemDto, 'amount_hidden'> & { contact_id: string; amount_vnd: string | null };
export interface ActivityStore {
  notes: Note[];
  tasks: Task[];
  opps: Opp[];
}

const ME = 'u_tram';
const NAMES: Record<string, string> = { u_tram: 'Trâm', u_minh: 'Minh', u_huong: 'Hương' };
const v = (s: string) => `2026-06-0${s}`;

export const seedActivities = (): ActivityStore => ({
  notes: [
    { id: 'nt_lan_1', contact_id: 'ct_lan', kind: 'note', body: 'Khách quan tâm liệu trình HIFU và chăm sóc da. Ưu tiên hẹn demo trong tuần này.', author_id: ME, created_at: v('2T03:35:00.000Z'), version: 1, deleted: false },
    { id: 'nt_lan_2', contact_id: 'ct_lan', kind: 'comment', body: 'Cần gửi thêm case study ngành làm đẹp', author_id: ME, created_at: v('2T03:36:00.000Z'), version: 1, deleted: false },
  ],
  tasks: [
    { id: 'tk_lan_1', contact_id: 'ct_lan', title: 'Gọi lại cho khách', description: '', due_at: '2026-06-24T02:00:00.000Z', assignee_id: ME, state: 'done', completed_at: '2026-06-24T03:00:00.000Z', version: 2, created_at: v('1T01:00:00.000Z') },
    { id: 'tk_lan_2', contact_id: 'ct_lan', title: 'Gửi báo giá liệu trình', description: '', due_at: '2026-06-24T03:00:00.000Z', assignee_id: ME, state: 'done', completed_at: '2026-06-24T04:00:00.000Z', version: 2, created_at: v('1T01:01:00.000Z') },
    { id: 'tk_lan_3', contact_id: 'ct_lan', title: 'Demo sản phẩm', description: '', due_at: '2026-06-10T02:00:00.000Z', assignee_id: ME, state: 'open', completed_at: null, version: 1, created_at: v('1T01:02:00.000Z') },
    { id: 'tk_lan_4', contact_id: 'ct_lan', title: 'Ký hợp đồng', description: '', due_at: null, assignee_id: ME, state: 'open', completed_at: null, version: 1, created_at: v('1T01:03:00.000Z') },
  ],
  opps: [
    { id: 'op_lan_1', contact_id: 'ct_lan', title: 'Liệu trình HIFU + Combo da', need: 'Khách cần liệu trình HIFU + combo da cho Shop Bé Na; ngân sách 20–50 triệu; ưu tiên demo trong tuần này.', amount_vnd: '48000000', stage: 'proposal', probability: 70, expected_close_date: '2026-06-15', quote_id: null, archived: false, updated_at: v('2T03:40:00.000Z'), version: 1 },
  ],
});

const err = (status: number, code: 'NOT_FOUND' | 'VALIDATION_FAILED' | 'STALE_VERSION' | 'FORBIDDEN', fields?: Record<string, string>) => new ApiRequestError(status, { code, message: code, ...(fields ? { fields } : {}) });
const authz = (role: SystemRole) => authzForRole(role, ME);
const has = (role: SystemRole, p: string) => can(authz(role), p as PermissionKey);
const now = () => new Date().toISOString();

const noteDto = (n: Note): NoteItemDto => ({ id: n.id, kind: n.kind, body: n.body, author: n.author_id ? { type: 'user', name: NAMES[n.author_id] ?? n.author_id } : { type: 'agent', name: 'AI Agent' }, created_at: n.created_at, version: n.version });
const taskDto = (t: Task): TaskItemDto => ({ id: t.id, title: t.title, description: t.description, due_at: t.due_at, assignee: t.assignee_id ? { id: t.assignee_id, name: NAMES[t.assignee_id] ?? t.assignee_id, available: t.assignee_id in NAMES } : null, state: t.state, completed_at: t.completed_at, version: t.version });
const oppDto = (o: Opp, role: SystemRole): OpportunityItemDto => {
  const { amount_vnd, ...all } = o;
  const { contact_id: _drop, ...rest } = all; // eslint-disable-line @typescript-eslint/no-unused-vars
  return has(role, 'quote.view') ? { ...rest, amount_vnd } : { ...rest, amount_hidden: true };
};

const STATE_ORDER = { open: 0, done: 1, cancelled: 2 } as const;
function rows(s: ActivityStore, contactId: string, kind: ActivityKind) {
  if (kind === 'tasks')
    return s.tasks
      .filter((t) => t.contact_id === contactId)
      .sort((a, b) => STATE_ORDER[a.state] - STATE_ORDER[b.state] || (a.due_at ?? '~').localeCompare(b.due_at ?? '~') || a.id.localeCompare(b.id));
  if (kind === 'opportunities') return s.opps.filter((o) => o.contact_id === contactId && !o.archived).sort((a, b) => b.updated_at.localeCompare(a.updated_at) || b.id.localeCompare(a.id));
  const k = kind === 'notes' ? 'note' : 'comment';
  return s.notes.filter((n) => n.contact_id === contactId && n.kind === k && !n.deleted).sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
}
const dto = (kind: ActivityKind, r: Note | Task | Opp, role: SystemRole) => (kind === 'tasks' ? taskDto(r as Task) : kind === 'opportunities' ? oppDto(r as Opp, role) : noteDto(r as Note));

/** Một trang (cursor = `kind:offset` — mock; server mã hoá bộ sắp xếp). */
export function activityPage(s: ActivityStore, role: SystemRole, contactId: string, q: { kind: ActivityKind; cursor?: string; limit?: number; activity_id?: string }): ActivityPageDto {
  const all = rows(s, contactId, q.kind);
  if (q.activity_id) return { kind: q.kind, items: all.filter((r) => r.id === q.activity_id).map((r) => dto(q.kind, r, role)), next_cursor: null };
  const [ck, off] = (q.cursor ?? `${q.kind}:0`).split(':');
  if (ck !== q.kind || !/^\d+$/.test(off ?? '')) throw err(400, 'VALIDATION_FAILED', { cursor: 'invalid' });
  const limit = Math.min(Math.max(Number(q.limit ?? 30), 1), 100);
  const start = Number(off);
  const page = all.slice(start, start + limit);
  return { kind: q.kind, items: page.map((r) => dto(q.kind, r, role)), next_cursor: start + limit < all.length ? `${q.kind}:${start + limit}` : null };
}

export function activitySummary(s: ActivityStore, role: SystemRole, contactId: string, canEdit: boolean): ActivitySummaryDto {
  const notes = rows(s, contactId, 'notes') as Note[];
  const comments = rows(s, contactId, 'comments') as Note[];
  const tasks = rows(s, contactId, 'tasks') as Task[];
  const opps = rows(s, contactId, 'opportunities') as Opp[];
  const current = opps.find((o) => o.stage !== 'won' && o.stage !== 'lost') ?? opps[0] ?? null;
  return {
    notes: { latest: notes[0] ? noteDto(notes[0]) : null, count: notes.length },
    comments: { items: comments.slice(0, 10).map(noteDto), count: comments.length, next_cursor: comments.length > 10 ? 'comments:10' : null },
    tasks: { items: tasks.slice(0, 10).map(taskDto), open: tasks.filter((t) => t.state === 'open').length, next_cursor: tasks.length > 10 ? 'tasks:10' : null },
    opportunity: { current: current ? oppDto(current, role) : null, count: opps.length },
    can_edit: canEdit,
  };
}

const check = (cur: number, ifv?: number) => {
  if (ifv !== undefined && ifv !== cur) throw err(409, 'STALE_VERSION', { version: String(cur) });
};
const findTask = (s: ActivityStore, id: string) => s.tasks.find((t) => t.id === id) ?? null;
const findOpp = (s: ActivityStore, id: string) => s.opps.find((o) => o.id === id) ?? null;

export interface ActivityCtx<D> {
  store: (db: D) => ActivityStore;
  role: (db: D) => SystemRole;
  /** Khách sửa được (ném 404 nếu không thấy / không sửa được). */
  writable: (db: D, contactId: string) => void;
  nextId: (db: D, p: string) => string;
}

type Undo = { __id?: string; __prev?: Record<string, unknown>; __v?: number };
/** 9 action hoạt động — undo ghi lại id + bản trước vào input (như mock khác). */
export function activityHandlers<D>(c: ActivityCtx<D>) {
  const note = (kind: 'note' | 'comment') => ({
    execute: (db: D, i: { contact_id: string; body: string } & Undo) => {
      c.writable(db, i.contact_id);
      const n: Note = { id: c.nextId(db, 'nt'), contact_id: i.contact_id, kind, body: i.body.trim(), author_id: ME, created_at: now(), version: 1, deleted: false };
      c.store(db).notes.push(n);
      i.__id = n.id;
      return { note_id: n.id, kind, version: 1 };
    },
    undo: (db: D, i: Undo) => {
      const n = c.store(db).notes.find((x) => x.id === i.__id);
      if (n) n.deleted = true;
    },
    preview: (_db: D, i: { body: string }) => ({ summary: i.body.slice(0, 80) }),
  });
  const moneyGuard = (db: D, p: { amount_vnd?: string | null }) => {
    if (p.amount_vnd !== undefined && !has(c.role(db), 'quote.create')) throw err(403, 'FORBIDDEN', { amount_vnd: 'forbidden' });
  };
  return {
    'contact.add_note': note('note'),
    'contact.add_comment': note('comment'),
    'contact_activity.list': {
      execute: (db: D, i: { contact_id: string; kind: ActivityKind; cursor?: string; limit?: number; activity_id?: string }) => activityPage(c.store(db), c.role(db), i.contact_id, i),
    },
    'contact_task.create': {
      execute: (db: D, i: { contact_id: string; title: string; description?: string; due_at?: string | null; assignee_user_id?: string | null } & Undo) => {
        c.writable(db, i.contact_id);
        const assignee = i.assignee_user_id === undefined ? ME : i.assignee_user_id;
        if (assignee && !(assignee in NAMES)) throw err(422, 'VALIDATION_FAILED', { assignee_user_id: 'not_eligible' });
        const t: Task = { id: c.nextId(db, 'tk'), contact_id: i.contact_id, title: i.title.trim(), description: i.description ?? '', due_at: i.due_at ? new Date(i.due_at).toISOString() : null, assignee_id: assignee, state: 'open', completed_at: null, version: 1, created_at: now() };
        c.store(db).tasks.push(t);
        i.__id = t.id;
        return { task_id: t.id, version: 1 };
      },
      undo: (db: D, i: Undo) => {
        const t = findTask(c.store(db), i.__id ?? '');
        if (t && t.version === 1) Object.assign(t, { state: 'cancelled', version: 2 });
      },
      preview: (_db: D, i: { title: string }) => ({ summary: i.title }),
    },
    'contact_task.update': {
      execute: (db: D, i: { task_id: string; if_version?: number; patch: { title?: string; description?: string; due_at?: string | null; assignee_user_id?: string | null } } & Undo) => {
        const t = findTask(c.store(db), i.task_id);
        if (!t) throw err(404, 'NOT_FOUND', { task_id: 'not_found' });
        c.writable(db, t.contact_id);
        check(t.version, i.if_version);
        const p = i.patch;
        if (p.assignee_user_id && !(p.assignee_user_id in NAMES)) throw err(422, 'VALIDATION_FAILED', { assignee_user_id: 'not_eligible' });
        const next = { ...(p.title !== undefined ? { title: p.title.trim() } : {}), ...(p.description !== undefined ? { description: p.description } : {}), ...(p.due_at !== undefined ? { due_at: p.due_at ? new Date(p.due_at).toISOString() : null } : {}), ...(p.assignee_user_id !== undefined ? { assignee_id: p.assignee_user_id } : {}) };
        const changed = Object.entries(next).some(([k, val]) => (t as unknown as Record<string, unknown>)[k] !== val);
        if (!changed) return { task_id: t.id, version: t.version };
        i.__prev = { title: t.title, description: t.description, due_at: t.due_at, assignee_id: t.assignee_id };
        Object.assign(t, next, { version: t.version + 1 });
        i.__v = t.version;
        return { task_id: t.id, version: t.version };
      },
      undo: (db: D, i: { task_id: string } & Undo) => {
        const t = findTask(c.store(db), i.task_id);
        if (t && i.__prev && t.version === i.__v) Object.assign(t, i.__prev, { version: t.version + 1 });
      },
      preview: (_db: D, i: { patch: { title?: string } }) => ({ summary: i.patch.title ?? 'contact_task.update' }),
    },
    'contact_task.set_state': {
      execute: (db: D, i: { task_id: string; if_version?: number; state: Task['state'] } & Undo) => {
        const t = findTask(c.store(db), i.task_id);
        if (!t) throw err(404, 'NOT_FOUND', { task_id: 'not_found' });
        c.writable(db, t.contact_id);
        check(t.version, i.if_version);
        if (t.state === i.state) return { task_id: t.id, state: t.state, version: t.version };
        if (!taskMoveAllowed(t.state, i.state)) throw err(422, 'VALIDATION_FAILED', { state: 'transition' });
        i.__prev = { state: t.state, completed_at: t.completed_at };
        Object.assign(t, { state: i.state, completed_at: i.state === 'done' ? now() : null, version: t.version + 1 });
        i.__v = t.version;
        return { task_id: t.id, state: t.state, version: t.version };
      },
      undo: (db: D, i: { task_id: string } & Undo) => {
        const t = findTask(c.store(db), i.task_id);
        if (t && i.__prev && t.version === i.__v) Object.assign(t, i.__prev, { version: t.version + 1 });
      },
      preview: (_db: D, i: { state: string }) => ({ summary: i.state }),
    },
    'contact_opportunity.create': {
      execute: (db: D, i: Partial<Opp> & { contact_id: string; title: string } & Undo) => {
        c.writable(db, i.contact_id);
        moneyGuard(db, i);
        if (i.stage === 'won' || i.stage === 'lost') throw err(422, 'VALIDATION_FAILED', { stage: 'terminal_on_create' });
        const o: Opp = { id: c.nextId(db, 'op'), contact_id: i.contact_id, title: i.title.trim(), need: i.need ?? '', amount_vnd: i.amount_vnd ?? null, stage: i.stage ?? 'open', probability: i.probability ?? null, expected_close_date: i.expected_close_date ?? null, quote_id: i.quote_id ?? null, archived: false, updated_at: now(), version: 1 };
        c.store(db).opps.push(o);
        i.__id = o.id;
        return { opportunity_id: o.id, version: 1 };
      },
      undo: (db: D, i: Undo) => {
        const o = findOpp(c.store(db), i.__id ?? '');
        if (o && o.version === 1) Object.assign(o, { archived: true, version: 2 });
      },
      preview: (_db: D, i: { title: string }) => ({ summary: i.title }),
    },
    'contact_opportunity.update': {
      execute: (db: D, i: { opportunity_id: string; if_version?: number; patch: Partial<Opp> } & Undo) => {
        const o = findOpp(c.store(db), i.opportunity_id);
        if (!o) throw err(404, 'NOT_FOUND', { opportunity_id: 'not_found' });
        c.writable(db, o.contact_id);
        if (o.archived) throw err(409, 'STALE_VERSION', { archived: 'true' });
        check(o.version, i.if_version);
        moneyGuard(db, i.patch);
        const changed = Object.entries(i.patch).some(([k, val]) => (o as unknown as Record<string, unknown>)[k] !== val);
        if (!changed) return { opportunity_id: o.id, version: o.version };
        i.__prev = Object.fromEntries(Object.keys(i.patch).map((k) => [k, (o as unknown as Record<string, unknown>)[k]]));
        Object.assign(o, i.patch, { updated_at: now(), version: o.version + 1 });
        i.__v = o.version;
        return { opportunity_id: o.id, version: o.version };
      },
      undo: (db: D, i: { opportunity_id: string } & Undo) => {
        const o = findOpp(c.store(db), i.opportunity_id);
        if (o && i.__prev && o.version === i.__v) Object.assign(o, i.__prev, { version: o.version + 1 });
      },
      preview: (_db: D, i: { patch: { title?: string } }) => ({ summary: i.patch.title ?? 'contact_opportunity.update' }),
    },
    'contact_opportunity.archive': {
      execute: (db: D, i: { opportunity_id: string; if_version?: number } & Undo) => {
        const o = findOpp(c.store(db), i.opportunity_id);
        if (!o) throw err(404, 'NOT_FOUND', { opportunity_id: 'not_found' });
        c.writable(db, o.contact_id);
        if (o.archived) return { opportunity_id: o.id, archived: true, version: o.version };
        check(o.version, i.if_version);
        Object.assign(o, { archived: true, version: o.version + 1 });
        i.__v = o.version;
        return { opportunity_id: o.id, archived: true, version: o.version };
      },
      undo: (db: D, i: { opportunity_id: string } & Undo) => {
        const o = findOpp(c.store(db), i.opportunity_id);
        if (o && o.version === i.__v) Object.assign(o, { archived: false, version: o.version + 1 });
      },
      preview: (db: D, i: { opportunity_id: string }) => ({ summary: findOpp(c.store(db), i.opportunity_id)?.title ?? i.opportunity_id }),
    },
  };
}

/** `GET /contacts/:id/activities` — khách không thấy → null (404). */
export function activityRoute<D>(path: string, c: Pick<ActivityCtx<D>, 'store' | 'role'> & { visible: (db: D, id: string) => boolean }) {
  const m = path.match(/^\/contacts\/([^/]+)\/activities$/);
  if (!m) return null;
  const id = m[1]!;
  return (db: D, p: Record<string, unknown>) => {
    if (!c.visible(db, id)) return null;
    const page = activityPage(c.store(db), c.role(db), id, { kind: p.kind as ActivityKind, cursor: p.cursor as string | undefined, limit: p.limit ? Number(p.limit) : undefined, activity_id: p.activity_id as string | undefined });
    return { data: page.items, next_cursor: page.next_cursor };
  };
}
