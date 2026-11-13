// Mock sửa ticket hàng loạt + hoàn tác có canh gác (TIP-034c) — cùng hợp đồng native: thao tác cha = việc dữ liệu (data-jobs mock), con
// chạy TỪNG ticket với biên nhận (đã đổi / no-op / mã lỗi an toàn + trước / sau chỉ trường đã đổi + version sau). ≤ 50 xong ngay (200 kết
// quả từng id), 51–200 → 202 rồi đọc `/data-jobs/:id/result`. Hoàn tác thô của log cha → 409 UNDO_REQUIRES_ACTION (mock-transport);
// `ticket.bulk_undo` chỉ khi thao tác đi đã kết thúc (OPERATION_BUSY), niêm phong (thử lại đi → 409), hai yêu cầu hội tụ một lượt;
// ticket bị sửa sau đó (version khác) → CONFLICT, giữ nguyên. Log cha chỉ thành "đã hoàn tác" khi MỌI ticket đã đổi được hoàn tác.
import { ApiRequestError, BULK_SYNC_MAX, normalizeTicketIds, type TicketBulkOutcome } from '@appchat/shared';
import type { MockHandler } from '../handlers';
import type { MockDb } from '../store';
import { bindJobLog, jobOfLog, jobState, registerMockJobResult, sealJob, startJob } from './data-jobs';
import { ticketVisible } from './ticket-scope';
import { touch, type Ticket } from './tickets';

const KIND = 'ticket.bulk_update';
const UNDO_KIND = 'ticket.bulk_undo';
/** Cha có action hoàn tác riêng (như undo-action-registry server). */
export const bulkUndoActionOf = (actionId: string | undefined) => (actionId === KIND ? UNDO_KIND : undefined);

type Patch = { assignee_user_id?: string; assignee_agent_id?: string; priority?: 'high' | 'medium' | 'low' };
type Fields = Pick<Ticket, 'assignee_user_id' | 'assignee_agent_id' | 'team_id' | 'priority'>;
type Receipt = { changed: boolean; before?: Partial<Fields>; after?: Partial<Fields>; version?: number };
type Run = {
  ids: string[];
  duplicates: number;
  receipts: Map<string, Receipt>;
  parentLog?: string;
  undoJob?: string;
};

const runs = new Map<string, Run>();
const TERMINAL = new Set(['completed', 'cancelled', 'failed']);
const live = (db: MockDb, id: string) => db.tickets.tickets.find((x) => x.id === id && ticketVisible(db, x));
const pick = (t: Ticket, keys: (keyof Fields)[]) =>
  Object.fromEntries(keys.map((k) => [k, t[k]])) as Partial<Fields>;
const keysOf = (p: Patch): (keyof Fields)[] => [
  ...(p.assignee_user_id || p.assignee_agent_id
    ? (['assignee_user_id', 'assignee_agent_id', 'team_id'] as const)
    : []),
  ...(p.priority ? (['priority'] as const) : []),
];

function apply(t: Ticket, p: Patch) {
  if (p.assignee_agent_id)
    Object.assign(t, { assignee_agent_id: p.assignee_agent_id, assignee_user_id: null, team_id: 't_ai' });
  else if (p.assignee_user_id)
    Object.assign(t, { assignee_user_id: p.assignee_user_id, assignee_agent_id: null });
  if (p.priority) t.priority = p.priority;
}

/** Kết quả theo id nhập (như project() của server): chưa chạy khi việc còn chạy = pending; việc đã dừng = NOT_APPLIED. */
function project(jobId: string) {
  const j = jobState(jobId)!;
  const run = runs.get(jobId)!;
  const by = new Map(j.items.map((i) => [i.target_id, i]));
  const done = TERMINAL.has(j.status);
  const outcomes: TicketBulkOutcome[] = run.ids.map((id) => {
    const r = by.get(id);
    if (!r) return { id, ok: false, error: { code: 'NOT_FOUND' } };
    if (r.status === 'done') return { id, ok: true, changed: run.receipts.get(id)?.changed === true };
    if (r.status === 'pending')
      return done ? { id, ok: false, error: { code: 'NOT_APPLIED' } } : { id, ok: false, pending: true };
    return { id, ok: false, error: { code: r.error ?? 'INTERNAL' } };
  });
  return {
    outcomes,
    operation: {
      job_id: jobId,
      status: j.status,
      total: j.total,
      pending: outcomes.filter((o) => o.pending).length,
    },
  };
}
const failedOf = (o: TicketBulkOutcome[]) => o.filter((x) => !x.ok && !x.pending).length;
const bulkResult = (jobId: string) => {
  const { outcomes, operation } = project(jobId);
  const ok = outcomes.filter((o) => o.ok);
  return {
    updated: ok.length,
    changed_count: ok.filter((o) => o.changed).length,
    failed: failedOf(outcomes),
    duplicates: runs.get(jobId)!.duplicates,
    outcomes,
    operation,
  };
};
const undoResult = (jobId: string) => {
  const { outcomes, operation } = project(jobId);
  const bad = outcomes.filter((o) => !o.ok && !o.pending);
  return {
    undone: outcomes.filter((o) => o.ok).length,
    conflicts: bad.filter((o) => o.error?.code === 'CONFLICT').length,
    failed: bad.length,
    outcomes,
    operation,
  };
};
registerMockJobResult(KIND, (_db, id) => bulkResult(id));
registerMockJobResult(UNDO_KIND, (_db, id) => undoResult(id));

const accepted = (jobId: string, body: object, sync: boolean) =>
  sync ? body : { ...body, __accepted: { job_id: jobId, status_url: `/v1/data-jobs/${jobId}` } };

/** Thao tác đi của log cha + các ticket đã đổi thành công (tập hoàn tác). */
function forward(logId: string) {
  const jobId = jobOfLog(logId);
  const run = jobId ? runs.get(jobId) : undefined;
  if (!jobId || !run)
    throw new ApiRequestError(404, {
      code: 'NOT_FOUND',
      message: 'parent_action_log_id',
      fields: { parent_action_log_id: 'not_found' },
    });
  const j = jobState(jobId)!;
  if (!TERMINAL.has(j.status))
    throw new ApiRequestError(409, {
      code: 'OPERATION_BUSY',
      message: j.status,
      fields: { status: j.status },
    });
  const changed = j.items
    .filter((i) => i.status === 'done' && run.receipts.get(i.target_id)?.changed)
    .map((i) => i.target_id);
  return { jobId, run, changed };
}

export const ticketBulkHandlers: Record<string, MockHandler> = {
  [KIND]: {
    preview: (db, i: Patch & { ticket_ids: string[]; if_versions?: Record<string, number> }) => {
      const { ids, duplicates } = normalizeTicketIds(i.ticket_ids);
      const rows = ids.map((id) => live(db, id));
      const closed = rows.filter((t) => t?.status === 'closed').length;
      const missing = rows.filter((t) => !t).length;
      const n = ids.length - closed - missing;
      const skipped = Object.fromEntries(
        Object.entries({ not_found: missing, closed, duplicates }).filter(([, v]) => v),
      );
      const warnings = [
        ...(i.assignee_agent_id ? ['agent_assignment_not_run'] : []),
        ...(n > BULK_SYNC_MAX ? ['bulk_background'] : []),
      ];
      return {
        summary: `${n}`,
        count: n,
        changes: [
          { entity: 'ticket', after: { ...(i.priority ? { priority: i.priority } : {}) } },
          ...(Object.keys(skipped).length ? [{ entity: 'ticket_bulk', after: skipped }] : []),
        ],
        ...(warnings.length ? { warnings } : {}),
      };
    },
    execute: (db, i: Patch & { ticket_ids: string[]; if_versions?: Record<string, number> }) => {
      const { ids, duplicates } = normalizeTicketIds(i.ticket_ids);
      const receipts = new Map<string, Receipt>();
      const keys = keysOf(i);
      const runner = {
        run: (d: unknown, id: string) => {
          const t = live(d as MockDb, id);
          if (!t) return { status: 'failed' as const, error: 'NOT_FOUND' };
          if (t.status === 'closed') return { status: 'failed' as const, error: 'INVALID_TRANSITION' };
          const want = i.if_versions?.[id];
          if (want !== undefined && want !== (t.version ?? 1))
            return { status: 'failed' as const, error: 'STALE_VERSION' };
          const before = pick(t, keys);
          apply(t, i);
          const after = pick(t, keys);
          const changed = JSON.stringify(before) !== JSON.stringify(after);
          if (changed)
            touch(t, { type: i.assignee_user_id || i.assignee_agent_id ? 'assigned' : 'priority' });
          receipts.set(id, changed ? { changed, before, after, version: t.version ?? 1 } : { changed });
          return { status: 'done' as const, error: null };
        },
      };
      // ≤ 50: chạy hết ngay (như afterCommit + settled của server) qua cùng giả worker của data-jobs.
      const sync = ids.length <= BULK_SYNC_MAX;
      const jobId = startJob(db, KIND, ids, runner, sync);
      runs.set(jobId, { ids, duplicates, receipts });
      return accepted(jobId, bulkResult(jobId), sync);
    },
  },
  [UNDO_KIND]: {
    preview: (db, i: { parent_action_log_id: string }) => {
      const { run, changed } = forward(i.parent_action_log_id);
      const conflicts = changed.filter(
        (id) => (live(db, id)?.version ?? -1) !== run.receipts.get(id)!.version,
      ).length;
      return {
        summary: `${changed.length - conflicts}`,
        count: changed.length - conflicts,
        changes: [
          {
            entity: 'ticket_bulk_undo',
            after: { revert: changed.length - conflicts, ...(conflicts ? { conflicts } : {}) },
          },
        ],
        ...(conflicts ? { warnings: ['undo_conflicts_kept'] } : {}),
      };
    },
    execute: (db, i: { parent_action_log_id: string }) => {
      const { jobId, run, changed } = forward(i.parent_action_log_id);
      // Hai yêu cầu hội tụ: đã có lượt hoàn tác của thao tác này → trả đúng lượt đó.
      if (run.undoJob) return undoResult(run.undoJob);
      sealJob(jobId);
      const runner = {
        run: (d: unknown, id: string) => {
          const t = live(d as MockDb, id);
          const r = run.receipts.get(id)!;
          if (!t) return { status: 'failed' as const, error: 'NOT_FOUND' };
          if (
            (t.version ?? 1) !== r.version ||
            JSON.stringify(pick(t, Object.keys(r.after!) as (keyof Fields)[])) !== JSON.stringify(r.after)
          )
            return { status: 'failed' as const, error: 'CONFLICT' };
          Object.assign(t, r.before);
          touch(t, { type: 'assignee_user_id' in r.before! ? 'assigned' : 'priority' });
          return { status: 'done' as const, error: null };
        },
        done: (d: unknown, undoId: string) => {
          if (jobState(undoId)!.items.every((x) => x.status === 'done'))
            (d as MockDb).assistant.logs.forEach((l) => l.id === i.parent_action_log_id && (l.undone = true));
        },
      };
      const sync = changed.length <= BULK_SYNC_MAX;
      const undoId = startJob(db, UNDO_KIND, changed, runner, sync);
      runs.set(undoId, { ids: changed, duplicates: 0, receipts: new Map() });
      run.undoJob = undoId;
      return accepted(undoId, undoResult(undoId), sync);
    },
  },
};

/** Gắn log của yêu cầu vào việc (data_job.action_log_id) — mock-transport gọi sau khi ghi nhật ký. */
export const bindBulkLog = (result: unknown, logId: string) => {
  const r = result as { operation?: { job_id?: string }; __accepted?: { job_id: string } } | null;
  const jobId = r?.__accepted?.job_id ?? r?.operation?.job_id;
  if (jobId && runs.has(jobId) && jobState(jobId)?.logId === undefined) bindJobLog(jobId, logId);
};
