// Reader xuất danh sách Ticket (TIP-038 pha 3): chốt id bằng đúng điều kiện + thứ tự màn Ticket (`ticketWhereSql` / `ticketOrderSql`), dựng
// dòng theo lô id: lọc lại scope support HIỆN TẠI rồi nạp theo PK. SLA tính tại thời điểm xuất (cùng `slaStateOf` của danh sách).
import { TenantSql as Prisma } from '@appchat/db';
import { serverMessages, slaStateOf } from '@appchat/shared';
import { supportScopeSql } from '../../support/ticket-access';
import {
  ticketOrderSql,
  ticketWhereSql,
  type TicketFilter,
} from '../../support/services/tickets-read.service';
import { customCell, stamp } from './export-columns';
import type { ListReader } from './types';

const s = (v: unknown) => (typeof v === 'string' && v ? v : undefined);

export const ticketReader: ListReader<TicketFilter> = {
  kind: 'ticket.export',
  entity: 'ticket',
  filter: (i) => ({
    status: s(i.status),
    priority: s(i.priority),
    team: s(i.team),
    category: s(i.category),
    assignee: s(i.assignee),
    sla: s(i.sla),
    q: s(i.q),
    sort: s(i.sort),
    custom: i.custom && typeof i.custom === 'object' ? (i.custom as Record<string, string>) : undefined,
  }),
  async snapshot(tx, a, f, cap, now) {
    const rows = await tx.$queryRaw<
      { id: string }[]
    >`SELECT t.id FROM ticket t WHERE ${ticketWhereSql(a, f, now)} ORDER BY ${ticketOrderSql(f)} LIMIT ${cap}`;
    return rows.map((r) => r.id);
  },
  columns: (m) => [
    { key: 'code', header: m.col.code, width: 14 },
    { key: 'title', header: m.col.title, width: 32 },
    { key: 'category', header: m.col.category },
    { key: 'channel', header: m.col.channel },
    { key: 'company', header: m.col.company, width: 22 },
    { key: 'email', header: m.col.email, width: 24 },
    { key: 'priority', header: m.col.priority },
    { key: 'status', header: m.col.status },
    { key: 'assignee', header: m.col.assignee, width: 20 },
    { key: 'sla', header: m.col.sla },
    { key: 'ttrDue', header: m.col.ttrDue },
    { key: 'createdAt', header: m.col.createdAt },
  ],
  async rows(tx, a, xs, place, now) {
    if (!xs.length) return { ids: [], rows: [] };
    const live = await tx.$queryRaw<
      { id: string }[]
    >`SELECT t.id FROM ticket t WHERE t.id IN (${Prisma.join(xs.map((x) => Prisma.sql`${x}::uuid`))}) AND ${supportScopeSql(a)}`;
    const at = new Map(xs.map((id, i) => [id, i]));
    const list = (await tx.ticket.findMany({ where: { id: { in: live.map((r) => r.id) } } })).sort(
      (x, y) => at.get(x.id)! - at.get(y.id)!,
    );
    const agents = await tx.aiAgent.findMany({
      where: { id: { in: list.map((t) => t.assigneeAgentId).filter((x): x is string => !!x) } },
      select: { id: true, name: true },
    });
    const agentName = new Map(agents.map((x) => [x.id, x.name]));
    const people = await place.names(list.map((t) => t.assigneeUserId));
    const m = serverMessages(place.locale).insights.export;
    return {
      ids: list.map((t) => t.id),
      rows: list.map((t) => {
        const sla = slaStateOf({
          status: t.status,
          slaResult: t.slaResult,
          start: t.ttrStartAt,
          due: t.ttrDueAt,
          pausedAt: t.pausedSince,
          now,
        }).state;
        const who = t.assigneeAgentId
          ? (agentName.get(t.assigneeAgentId) ?? '')
          : (people.get(t.assigneeUserId ?? '') ?? '');
        return [
          t.code,
          t.title,
          t.category,
          t.channel,
          t.company,
          t.email,
          m.priority[t.priority as keyof typeof m.priority] ?? t.priority,
          m.ticket[t.status as keyof typeof m.ticket] ?? t.status,
          who,
          m.sla[sla],
          stamp(t.ttrDueAt, place.timeZone),
          stamp(t.createdAt, place.timeZone),
          ...place.custom.map((c) => customCell(t.custom, c.key)),
        ];
      }),
    };
  },
};
