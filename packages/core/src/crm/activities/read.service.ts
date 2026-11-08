// Reader hoạt động CRM dùng chung (TIP-026b §3): GET /v1/contacts/:id/activities, action contact_activity.list, tóm tắt Hồ sơ 360°.
// Quyền khách cha kiểm lại mỗi trang; id → bản ghi qua PK (deferred join); tên người một lần cho cả trang (không N+1).
import { serverMessages, type ActivityKind, type ActivityPageDto, type ActivitySummaryDto, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { readableParent } from './authority';
import { UUID } from '../services/access';
import { decodeCursor, pageIds } from './repository';
import { noteDto, opportunityDto, taskDto } from './projection';

export interface ActivityReadCtx {
  authz: AuthzContext;
  locale: string;
  names: (ids: string[]) => Promise<Map<string, string>>;
  /** Id thành viên còn active (người được giao bị gỡ → không khả dụng). */
  activeMembers: () => Promise<Set<string>>;
}

const DEFAULT_LIMIT = 30;

async function load(tx: TenantTx, kind: ActivityKind, ids: string[], c: ActivityReadCtx) {
  if (!ids.length) return [];
  const order = new Map(ids.map((id, i) => [id, i]));
  const sort = <T extends { id: string }>(xs: T[]) => xs.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
  if (kind === 'notes' || kind === 'comments') {
    const rows = sort(await tx.contactNote.findMany({ where: { id: { in: ids } } }));
    const names = await c.names(rows.map((r) => r.authorUserId).filter((x): x is string => !!x));
    const agent = serverMessages(c.locale).crm.timelineExport.actor.agent;
    return rows.map((r) => noteDto(r, names, agent));
  }
  if (kind === 'tasks') {
    const rows = sort(await tx.contactTask.findMany({ where: { id: { in: ids } } }));
    const who = rows.map((r) => r.assigneeUserId).filter((x): x is string => !!x);
    const [names, active] = await Promise.all([c.names(who), who.length ? c.activeMembers() : Promise.resolve(new Set<string>())]);
    return rows.map((r) => taskDto(r, names, active));
  }
  return sort(await tx.contactOpportunity.findMany({ where: { id: { in: ids } } })).map((r) => opportunityDto(r, c.authz));
}

/** Một trang một loại. `activityId` = mở lại đúng một bản ghi đã biết (khác khách → 404). */
export async function activityPage(tx: TenantTx, contactId: string, q: { kind: ActivityKind; cursor?: string; limit?: number; activityId?: string }, c: ActivityReadCtx): Promise<ActivityPageDto> {
  await readableParent(tx, c.authz, contactId);
  if (q.activityId) {
    const table = q.kind === 'tasks' ? tx.contactTask : q.kind === 'opportunities' ? tx.contactOpportunity : tx.contactNote;
    const row = !UUID.test(q.activityId) ? null : await (table as typeof tx.contactTask).findUnique({ where: { id: q.activityId }, select: { id: true, contactId: true } });
    if (!row || row.contactId !== contactId) return { kind: q.kind, items: [], next_cursor: null };
    return { kind: q.kind, items: await load(tx, q.kind, [row.id], c), next_cursor: null };
  }
  const page = await pageIds(tx, contactId, q.kind, decodeCursor(q.cursor, q.kind), Math.min(Math.max(q.limit ?? DEFAULT_LIMIT, 1), 100));
  return { kind: q.kind, items: await load(tx, q.kind, page.ids, c), next_cursor: page.next };
}

/** Tóm tắt cho Hồ sơ 360°: ghi chú mới nhất (chỉ kind note), bình luận (chỉ kind comment), việc trang đầu, cơ hội hiện hành. */
export async function activitySummary(tx: TenantTx, contactId: string, writable: boolean, c: ActivityReadCtx): Promise<ActivitySummaryDto> {
  const [notes, comments, tasks, noteCount, commentCount, openTasks, oppCount] = await Promise.all([
    pageIds(tx, contactId, 'notes', null, 1),
    pageIds(tx, contactId, 'comments', null, 10),
    pageIds(tx, contactId, 'tasks', null, 10),
    tx.contactNote.count({ where: { contactId, kind: 'note', deletedAt: null } }),
    tx.contactNote.count({ where: { contactId, kind: 'comment', deletedAt: null } }),
    tx.contactTask.count({ where: { contactId, state: 'open' } }),
    tx.contactOpportunity.count({ where: { contactId, archivedAt: null } }),
  ]);
  // Cơ hội hiện hành: mới cập nhật nhất chưa kết thúc, không có thì mới nhất đã kết thúc (badge thật).
  const live = await tx.contactOpportunity.findFirst({ where: { contactId, archivedAt: null, stage: { notIn: ['won', 'lost'] } }, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], select: { id: true } });
  const current = live ?? (await tx.contactOpportunity.findFirst({ where: { contactId, archivedAt: null }, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], select: { id: true } }));
  const [n, cs, ts, op] = await Promise.all([load(tx, 'notes', notes.ids, c), load(tx, 'comments', comments.ids, c), load(tx, 'tasks', tasks.ids, c), current ? load(tx, 'opportunities', [current.id], c) : Promise.resolve([])]);
  return {
    notes: { latest: (n[0] as ActivitySummaryDto['notes']['latest']) ?? null, count: noteCount },
    comments: { items: cs as ActivitySummaryDto['comments']['items'], count: commentCount, next_cursor: comments.next },
    tasks: { items: ts as ActivitySummaryDto['tasks']['items'], open: openTasks, next_cursor: tasks.next },
    opportunity: { current: (op[0] as ActivitySummaryDto['opportunity']['current']) ?? null, count: oppCount },
    can_edit: writable,
  };
}
