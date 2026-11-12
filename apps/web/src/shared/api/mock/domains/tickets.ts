// Mock Ticket (Blueprint §4.4 support; §2.2 ticket): GET /tickets?status=&priority=&team=&category=&assignee=&sla=&q=&sort=, /tickets/meta, /tickets/:id.
// Dữ liệu = prototype TKDATA L8690 (fixture sinh bởi tools/scripts/fixtures/gen-tickets.py). Đồng hồ SLA tính theo giờ mock; "waiting" tạm dừng đồng hồ.
import { ApiRequestError, DEFAULT_WORKING_DAYS, SLA_DEFAULT, addBusinessMinutes } from '@appchat/shared';
import fixture from '../../../../../../../fixtures/prototype-parity/tickets.json';
import custFixture from '../../../../../../../fixtures/prototype-parity/customers.json';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';
import { ME } from './customers';
import { MOCK_NOW } from './quotes';
import { paginate } from '../paginate';
import { categoryMeta, type CategoryConfigState } from './ticket-categories';
import { ticketVisible } from './ticket-scope';

type Fixed = (typeof fixture.tickets)[number];
export type Comment = Fixed['comments'][number];
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
  csat?: number | null;
  deleted?: boolean;
};

export interface TicketsState {
  tickets: Ticket[];
  seq: number;
  /** TIP-034b: từ điển gợi ý danh mục — null = bản ảo version 0 (8 nhãn prototype). */
  categoryConfig: CategoryConfigState | null;
}

export const createTicketsState = (): TicketsState => ({
  tickets: structuredClone(fixture.tickets) as Ticket[],
  seq: 2041,
  categoryConfig: null,
});

export const NOW = Date.parse(MOCK_NOW);
/** Hạn SLA ticket mới = chính sách mặc định (người: phút làm việc T2–T6 08–18, T7 08–12 giờ VN; agent: tuyệt đối) — như server. */
const CAL = { days: DEFAULT_WORKING_DAYS, timeZone: 'Asia/Ho_Chi_Minh', enabled: true };
export const targets = (ai: boolean) => {
  const ttr = ai ? SLA_DEFAULT.ttr_ai : SLA_DEFAULT.ttr_human;
  const due = ai ? new Date(NOW + ttr * 60_000) : addBusinessMinutes(new Date(NOW), ttr, CAL);
  return { frt_target_min: ai && SLA_DEFAULT.frt_ai ? SLA_DEFAULT.frt_ai : SLA_DEFAULT.frt_human, ttr_target_min: ttr, ttr_due_at: due.toISOString() };
};
const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase();
const nameOf = (id: string | null) => custFixture.members.find((m) => m.id === id)?.name ?? '';
export const actor = () => nameOf(ME);

/** Trạng thái SLA: quá hạn · sắp đến hạn (≤ 60 phút) · trong hạn; ticket đóng = trong hạn / quá hạn theo sla_result. */
export const slaOf = (t: Ticket) => {
  if (t.status === 'closed') return { state: t.sla_result === 'breached' ? 'breach' : 'ok', left_min: null };
  const left = Math.round((Date.parse(t.ttr_due_at) - NOW) / 60_000);
  return { state: left < 0 ? 'breach' : left <= 60 ? 'risk' : 'ok', left_min: left };
};

const visible = ticketVisible;
export const find = (db: MockDb, id: string) => {
  const t = db.tickets.tickets.find((x) => x.id === id && !x.deleted);
  if (!t) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: id });
  return t;
};
const view = (t: Ticket) => ({
  ...t,
  csat: t.csat ?? null,
  sla: slaOf(t),
  assignee_name: t.assignee_agent_id ? fixture.agent.name : nameOf(t.assignee_user_id),
  team_name: fixture.teams.find((x) => x.id === t.team_id)?.name ?? '',
});
export const touch = (t: Ticket, e: Omit<Event, 'at' | 'by'> & { by?: string }) => {
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
    return paginate(rows, p);
  },
  '/tickets/meta': (db) => {
    const all = db.tickets.tickets.filter((t) => visible(db, t));
    return {
      now: MOCK_NOW,
      teams: fixture.teams,
      // TIP-034b: cấu hình trước rồi nhãn đã dùng trong ticket người xem thấy (không lộ nhãn ngoài scope).
      ...categoryMeta(db),
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

export { ticketsHandlers } from './tickets-actions';
