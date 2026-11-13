// Ghi Ticket ở mock — cùng TICKET_FLOW + luật với server (TIP-034, REQ-H01–H04): sai bước → INVALID_TRANSITION 409; phụ trách đúng
// một (người hoặc agent); cùng khách + danh mục còn mở trong 24 giờ → hỏi gộp (CONFLICT duplicate_of) / gộp / tạo mới; hạn SLA theo chính
// sách mặc định; đóng chốt sla_result; mở lại +1.
import { ApiRequestError, TICKET_DUP_HOURS, TICKET_FLOW, assertTransition, setStatusKey, type AppError } from '@appchat/shared';
import type { MockHandler } from '../handlers';
import { ME } from './customers';
import { MOCK_NOW } from './quotes';
import { NOW, actor, find, slaOf, targets, ticketsRoutes, touch, type Comment, type Ticket, type TicketStatus } from './tickets';

const deny = (code: 'INVALID_TRANSITION' | 'VALIDATION_FAILED' | 'CONFLICT', message: string, fields?: Record<string, string>): never => {
  throw new ApiRequestError(code === 'VALIDATION_FAILED' ? 422 : 409, { code, message, ...(fields ? { fields } : {}) });
};
/** Chuyển theo TICKET_FLOW như server — sai bước → INVALID_TRANSITION 409. */
const step = (t: Ticket, action: string): TicketStatus => {
  try {
    return assertTransition(TICKET_FLOW, t.status, action);
  } catch (e) {
    return deny('INVALID_TRANSITION', `${t.code}: ${t.status}`, { status: (e as AppError).fields?.status ?? t.status });
  }
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
  on_duplicate?: 'ask' | 'merge' | 'create';
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
      // REQ-H02: cùng khách + danh mục còn mở trong 24 giờ → hỏi gộp (server: 409 CONFLICT duplicate_of).
      const dup = i.contact_id && i.on_duplicate !== 'create'
        ? db.tickets.tickets.find((x) => !x.deleted && x.contact_id === i.contact_id && x.category === i.category && x.status !== 'closed' && NOW - Date.parse(x.created_at) <= TICKET_DUP_HOURS * 3_600_000)
        : undefined;
      if (dup && i.on_duplicate !== 'merge') deny('CONFLICT', dup.code, { duplicate_of: dup.code });
      if (dup) {
        dup.comments.push({ id: `cm_${dup.id}_${dup.comments.length + 1}`, author_type: 'user', author: actor(), body: [i.title, i.description].filter(Boolean).join(' · '), internal: true, at: MOCK_NOW });
        touch(dup, { type: 'note' });
        return { ticket_id: dup.id, code: dup.code, merged: true };
      }
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
        ...targets(!!i.assignee_agent_id),
        frt_min: 0,
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
  'ticket.update': {
    execute: (db, i: { ticket_id: string; title?: string; description?: string; category?: string; priority?: 'high' | 'medium' | 'low' }) => {
      const t = find(db, i.ticket_id);
      const { ticket_id, ...patch } = i;
      void ticket_id;
      if (i.priority && i.priority !== t.priority) touch(t, { type: 'priority' });
      Object.assign(t, patch, { updated_at: MOCK_NOW });
      return { ticket_id: t.id, status: t.status };
    },
  },
  'ticket.assign': {
    execute: (db, i: { ticket_id: string; assignee_user_id?: string; assignee_agent_id?: string; team_id?: string }) => {
      const t = find(db, i.ticket_id);
      if (!i.assignee_user_id === !i.assignee_agent_id) deny('VALIDATION_FAILED', 'assignee', { assignee: 'one_only' });
      if (t.status === 'closed') step(t, 'ticket.assign');
      assign(t, i);
      touch(t, { type: 'assigned' });
      return { ticket_id: t.id, status: t.status };
    },
  },
  'ticket.set_status': {
    execute: (db, i: { ticket_id: string; status: 'open' | 'in_progress' | 'waiting' }) => {
      const t = find(db, i.ticket_id);
      step(t, setStatusKey(i.status));
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
      step(t, 'ticket.close');
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
      step(t, 'ticket.reopen');
      Object.assign(t, { status: 'open', close_reason: null, sla_result: null, reopened_count: t.reopened_count + 1 });
      touch(t, { type: 'reopened' });
      return { ticket_id: t.id, status: t.status };
    },
  },
};
