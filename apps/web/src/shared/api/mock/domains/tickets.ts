// Mock Ticket (Blueprint §4.4 support; §2.2 ticket): GET /tickets?status=&priority=&team=&category=&assignee=&sla=&q=&sort=, /tickets/meta, /tickets/:id.
// Dữ liệu = prototype TKDATA L8690 (fixture sinh bởi tools/scripts/fixtures/gen-tickets.py). Đồng hồ SLA tính theo giờ mock; "waiting" tạm dừng đồng hồ.
import { ApiRequestError, ROLE_DEFS } from '@appchat/shared';
import fixture from '../../../../../../../fixtures/prototype-parity/tickets.json';
import custFixture from '../../../../../../../fixtures/prototype-parity/customers.json';
import type { MockHandler } from '../handlers';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';
import { ME } from './customers';
import { MOCK_NOW } from './quotes';

type Fixed = (typeof fixture.tickets)[number];
type Comment = Fixed['comments'][number];
type Event = { type: string; by: string; at: string; status?: string; reason?: string };
export type TicketStatus = 'open' | 'in_progress' | 'waiting' | 'closed';
export type Ticket = Omit<Fixed, 'status' | 'assignee_user_id' | 'assignee_agent_id' | 'paused_since' | 'sla_result' | 'close_reason' | 'contact_id' | 'events'> & {
  status: TicketStatus;
  assignee_user_id: string | null;
  assignee_agent_id: string | null;
  contact_id: string | null;
  paused_since: string | null;
  sla_result: string | null;
  close_reason: string | null;
  events: Event[];
  deleted?: boolean;
};

export interface TicketsState {
  tickets: Ticket[];
  seq: number;
}

export const createTicketsState = (): TicketsState => ({
  tickets: structuredClone(fixture.tickets) as Ticket[],
  seq: 2041,
});

const NOW = Date.parse(MOCK_NOW);
const TTR: Record<string, number> = { high: 480, medium: 960, low: 1440 };
const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase();
const nameOf = (id: string | null) => custFixture.members.find((m) => m.id === id)?.name ?? '';
const actor = () => nameOf(ME);

/** Trạng thái SLA: quá hạn · sắp đến hạn (≤ 60 phút) · trong hạn; ticket đóng = trong hạn / quá hạn theo sla_result. */
export const slaOf = (t: Ticket) => {
  if (t.status === 'closed') return { state: t.sla_result === 'breached' ? 'breach' : 'ok', left_min: null };
  const left = Math.round((Date.parse(t.ttr_due_at) - NOW) / 60_000);
  return { state: left < 0 ? 'breach' : left <= 60 ? 'risk' : 'ok', left_min: left };
};

const visible = (db: MockDb, t: Ticket) => {
  if (t.deleted) return false;
  const scope = ROLE_DEFS[db.role].scope.support;
  return scope === 'all' || (scope === 'own' && t.assignee_user_id === ME);
};
const find = (db: MockDb, id: string) => {
  const t = db.tickets.tickets.find((x) => x.id === id && !x.deleted);
  if (!t) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: id });
  return t;
};
const view = (t: Ticket) => ({
  ...t,
  sla: slaOf(t),
  assignee_name: t.assignee_agent_id ? fixture.agent.name : nameOf(t.assignee_user_id),
  team_name: fixture.teams.find((x) => x.id === t.team_id)?.name ?? '',
});
const touch = (t: Ticket, e: Omit<Event, 'at' | 'by'> & { by?: string }) => {
  t.updated_at = MOCK_NOW;
  t.events.push({ by: actor(), ...e, at: MOCK_NOW });
};

const PR_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

export const ticketsRoutes: Record<string, MockRoute> = {
  '/tickets': (db, p) => {
    const q = norm(String(p.q ?? '').trim());
    const is = (k: string, v: string) => !p[k] || p[k] === 'all' || p[k] === v;
    const rows = db.tickets.tickets
      .filter((t) => visible(db, t))
      .filter(
        (t) =>
          is('status', t.status) &&
          is('priority', t.priority) &&
          is('team', t.team_id) &&
          is('category', t.category) &&
          is('assignee', t.assignee_agent_id ? 'agent' : (t.assignee_user_id ?? '')) &&
          is('sla', slaOf(t).state) &&
          (!q || [t.code, t.title, t.company, t.email].some((v) => norm(v).includes(q))),
      )
      .sort((a, b) =>
        p.sort === 'priority'
          ? PR_RANK[a.priority]! - PR_RANK[b.priority]! || b.code.localeCompare(a.code)
          : b.created_at.slice(0, 10).localeCompare(a.created_at.slice(0, 10)) || b.code.localeCompare(a.code),
      )
      .map(view);
    return { data: rows, next_cursor: null };
  },
  '/tickets/meta': (db) => {
    const all = db.tickets.tickets.filter((t) => visible(db, t));
    return {
      now: MOCK_NOW,
      teams: fixture.teams,
      categories: fixture.categories,
      agent: fixture.agent,
      members: custFixture.members,
      trend: fixture.trend,
      ai: fixture.ai,
      counts: {
        total: all.length,
        open: all.filter((t) => t.status === 'open').length,
        waiting: all.filter((t) => t.status === 'waiting').length,
        breach: all.filter((t) => slaOf(t).state === 'breach').length,
        closed: all.filter((t) => t.status === 'closed').length,
      },
    };
  },
};

export const ticketsParamRoute = (path: string): MockRoute | undefined => {
  const m = path.match(/^\/tickets\/(tk_[^/]+)$/);
  if (!m) return undefined;
  return (db) => view(find(db, m[1]!));
};

const deny = (code: 'INVALID_STATE' | 'VALIDATION_FAILED', message: string): never => {
  throw new ApiRequestError(409, { code, message });
};
const assign = (t: Ticket, i: { assignee_user_id?: string; assignee_agent_id?: string; team_id?: string }) => {
  if (i.assignee_agent_id) Object.assign(t, { assignee_agent_id: i.assignee_agent_id, assignee_user_id: null, team_id: 't_ai' });
  else if (i.assignee_user_id) Object.assign(t, { assignee_user_id: i.assignee_user_id, assignee_agent_id: null });
  if (i.team_id) t.team_id = i.team_id;
};

type CreateIn = {
  title: string;
  company?: string;
  email?: string;
  contact_id?: string;
  channel: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  status?: 'open' | 'in_progress' | 'waiting';
  team_id?: string;
  assignee_user_id?: string;
  assignee_agent_id?: string;
  description?: string;
};

export const ticketsHandlers: Record<string, MockHandler> = {
  'ticket.search': {
    execute: (db, i: { q?: string; status?: string; priority?: string; sla?: string }) => ({
      tickets: (ticketsRoutes['/tickets']!(db, { ...i }) as { data: Ticket[] }).data.map((t) => ({
        id: t.id,
        code: t.code,
        title: t.title,
        status: t.status,
      })),
    }),
  },
  'ticket.create': {
    execute: (db, i: CreateIn) => {
      const n = ++db.tickets.seq;
      const t: Ticket = {
        id: `tk_${n}`,
        code: `TKT-${n}`,
        title: i.title,
        description: i.description ?? '',
        category: i.category,
        channel: i.channel,
        company: i.company ?? '',
        email: i.email ?? '',
        contact_id: i.contact_id ?? null,
        status: i.status ?? 'open',
        priority: i.priority,
        assignee_user_id: null,
        assignee_agent_id: null,
        team_id: i.team_id ?? 't_sp1',
        sla_policy_name: 'Mặc định',
        frt_target_min: 30,
        ttr_target_min: TTR[i.priority]!,
        frt_min: 0,
        ttr_due_at: new Date(NOW + TTR[i.priority]! * 60_000).toISOString(),
        paused_since: i.status === 'waiting' ? MOCK_NOW : null,
        sla_result: null,
        close_reason: null,
        escalations: 0,
        reopened_count: 0,
        created_at: MOCK_NOW,
        updated_at: MOCK_NOW,
        comments: i.description
          ? [{ id: `cm_${n}_1`, author_type: 'contact', author: i.company || '—', body: i.description, internal: false, at: MOCK_NOW }]
          : [],
        events: [{ type: 'created', by: actor(), at: MOCK_NOW }],
      };
      assign(t, { assignee_user_id: i.assignee_user_id ?? ME, assignee_agent_id: i.assignee_agent_id });
      db.tickets.tickets.unshift(t);
      return { ticket_id: t.id, code: t.code };
    },
    undo: (db) => {
      db.tickets.tickets.shift();
      db.tickets.seq--;
    },
  },
  'ticket.assign': {
    execute: (db, i: { ticket_id: string; assignee_user_id?: string; assignee_agent_id?: string; team_id?: string }) => {
      const t = find(db, i.ticket_id);
      if (!i.assignee_user_id === !i.assignee_agent_id) deny('VALIDATION_FAILED', 'assignee');
      assign(t, i);
      touch(t, { type: 'assigned' });
      return { ticket_id: t.id, status: t.status };
    },
  },
  'ticket.set_status': {
    execute: (db, i: { ticket_id: string; status: 'open' | 'in_progress' | 'waiting' }) => {
      const t = find(db, i.ticket_id);
      if (t.status === 'closed') deny('INVALID_STATE', `${t.code}: closed`);
      // Rời "waiting" → cộng thời gian tạm dừng vào hạn TTR.
      if (t.paused_since && i.status !== 'waiting') {
        t.ttr_due_at = new Date(Date.parse(t.ttr_due_at) + (NOW - Date.parse(t.paused_since))).toISOString();
        t.paused_since = null;
      }
      if (i.status === 'waiting' && !t.paused_since) t.paused_since = MOCK_NOW;
      t.status = i.status;
      touch(t, { type: 'status', status: i.status });
      return { ticket_id: t.id, status: t.status };
    },
  },
  'ticket.comment': {
    execute: (db, i: { ticket_id: string; body: string; internal: boolean }) => {
      const t = find(db, i.ticket_id);
      const c: Comment = {
        id: `cm_${t.id}_${t.comments.length + 1}`,
        author_type: 'user',
        author: actor(),
        body: i.body,
        internal: i.internal,
        at: MOCK_NOW,
      };
      t.comments.push(c);
      touch(t, { type: i.internal ? 'note' : 'reply' });
      return { ticket_id: t.id, comment_id: c.id };
    },
    undo: (db, i: { ticket_id: string }) => {
      db.tickets.tickets.find((x) => x.id === i.ticket_id)?.comments.pop();
    },
  },
  'ticket.close': {
    execute: (db, i: { ticket_id: string; reason: string }) => {
      const t = find(db, i.ticket_id);
      if (t.status === 'closed') deny('INVALID_STATE', `${t.code}: closed`);
      t.sla_result = slaOf(t).state === 'breach' ? 'breached' : 'met';
      t.status = 'closed';
      t.close_reason = i.reason;
      t.paused_since = null;
      touch(t, { type: 'closed', reason: i.reason });
      return { ticket_id: t.id, status: t.status, sla_result: t.sla_result as 'met' | 'breached' };
    },
  },
  'ticket.reopen': {
    execute: (db, i: { ticket_id: string }) => {
      const t = find(db, i.ticket_id);
      if (t.status !== 'closed') deny('INVALID_STATE', `${t.code}: ${t.status}`);
      Object.assign(t, { status: 'open', close_reason: null, sla_result: null, reopened_count: t.reopened_count + 1 });
      touch(t, { type: 'reopened' });
      return { ticket_id: t.id, status: t.status };
    },
  },
  'ticket.bulk_update': {
    execute: (
      db,
      i: { ticket_ids: string[]; assignee_user_id?: string; assignee_agent_id?: string; priority?: 'high' | 'medium' | 'low' },
    ) => {
      const rows = i.ticket_ids.map((id) => find(db, id));
      for (const t of rows) {
        assign(t, i);
        if (i.priority) t.priority = i.priority;
        touch(t, { type: i.priority ? 'priority' : 'assigned' });
      }
      return { updated: rows.length };
    },
  },
};
