// ticket.bulk_update (TIP-034c §1): thao tác cha BỀN — chuẩn hoá tập id (bỏ trùng một lần, giữ thứ tự nhập), patch kết hợp (người phụ
// trách HOẶC agent + ưu tiên; rỗng / hai ô người phụ trách → 422 trước mọi hiệu ứng), version đã nhận theo id (if_versions của người gọi,
// không có thì version chụp lúc xem trước — ràng vào confirm_token phía server). Transaction cha CHỈ ghi data_job + biên nhận pending (+
// action_log / idempotency của executor) — không ghi ticket nào, không gọi Executor lồng. ≤ 50 id: chạy con sau commit (cùng runner 045b,
// cùng biên nhận / quyền hiện tại / khôi phục khi sập — quét lại nếu tiến trình chết giữa chừng), phản hồi đọc lại từ biên nhận; 51–200 →
// 202 job_accepted. Hoàn tác thô qua /action-logs/:id/undo → 409 UNDO_REQUIRES_ACTION (ticket.bulk_undo).
import { hostname } from 'node:os';
import { Inject, Injectable } from '@nestjs/common';
import {
  AppError,
  BULK_SYNC_MAX,
  canonicalTicketPatch,
  checkIfVersions,
  isPatchError,
  normalizeTicketIds,
  type CanonicalTicketPatch,
  type TicketBulkResult,
} from '@appchat/shared';
import type { ActionInput, ActionPreview, ticketBulkUpdate } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ExecuteMeta, type HandlerOutcome } from '../../kernel/actions/handler';
import { jobAccepted } from '../../kernel/actions/job-accepted';
import { defined, preview } from '../../kernel/actions/preview-kit';
import { runDataJob } from '../../kernel/jobs/bulk-dispatch';
import { allowedAction } from '../../kernel/jobs/bulk-status';
import { createJob } from '../../kernel/jobs/data-jobs/store';
import { dataJobUrl } from '../../kernel/jobs/data-jobs/handlers';
import { fencedContactIds } from '../../kernel/privacy/guard';
import { CrmMembers, actorUserId } from '../../crm/public';
import { UUID, inSupportScope } from '../ticket-access';
import { who } from '../actions/previews/ticket-edit.handlers.preview';
import { recipientCols } from './mutations';
import { TicketBulkDeps } from './providers';
import { TICKET_BULK_KIND, bulkResultOf, type BulkJobInput } from './results';

type In = ActionInput<typeof ticketBulkUpdate>;
const OWNER = `api:${hostname()}:${process.pid}`;
const vKey = (id: string) => `v:${id}`;

/** Input → (id chuẩn hoá, patch chuẩn) hoặc 422. */
export function admitInput(i: In): { ids: string[]; duplicates: number; patch: CanonicalTicketPatch } {
  const patch = canonicalTicketPatch(i);
  if (isPatchError(patch)) throw new AppError('VALIDATION_FAILED', 422, { [patch.field]: patch.code });
  const { ids, duplicates } = normalizeTicketIds(i.ticket_ids);
  const bad = checkIfVersions(ids, i.if_versions);
  if (bad) throw new AppError('VALIDATION_FAILED', 422, { [bad.field]: bad.code });
  return { ids, duplicates, patch };
}

/** Phân loại tập chọn theo trạng thái HIỆN TẠI người gọi thấy — một truy vấn, không lấy mẫu bản ghi ẩn. */
async function classify(tx: TenantTx, ctx: ActionContext, ids: string[], patch: CanonicalTicketPatch, ifv: Record<string, number> | undefined) {
  const uuids = ids.filter((id) => UUID.test(id));
  const rows = uuids.length ? await tx.ticket.findMany({ where: { id: { in: uuids } }, select: { id: true, status: true, version: true, priority: true, assigneeUserId: true, assigneeAgentId: true, teamId: true, createdByType: true, createdById: true, contactId: true } }) : [];
  const fenced = await fencedContactIds(tx, rows.flatMap((r) => (r.contactId ? [r.contactId] : [])));
  const seen = rows.filter((r) => inSupportScope(ctx.authz, r) && !(r.contactId && fenced.has(r.contactId)));
  const c = { eligible: [] as { id: string; version: number }[], not_found: ids.length - seen.length, read_only: 0, closed: 0, stale: 0, unchanged: 0 };
  for (const r of seen) {
    if (!inSupportScope(ctx.authz, r, 'write')) c.read_only++;
    else if (r.status === 'closed') c.closed++;
    else if (ifv?.[r.id] !== undefined && ifv[r.id] !== r.version) c.stale++;
    else {
      c.eligible.push({ id: r.id, version: r.version });
      const same = (!patch.assignee || (patch.assignee.kind === 'user' ? r.assigneeUserId === patch.assignee.id && !r.assigneeAgentId : r.assigneeAgentId === patch.assignee.id)) && (!patch.priority || r.priority === patch.priority);
      if (same) c.unchanged++;
    }
  }
  return c;
}

@Injectable()
@ActionHandler('ticket.bulk_update')
export class TicketBulkUpdateHandler implements Handler<In, TicketBulkResult> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(TicketBulkDeps) private readonly d: TicketBulkDeps,
  ) {}

  async preview(ctx: ActionContext, input: In, tx: TenantTx): Promise<ActionPreview> {
    const { ids, duplicates, patch } = admitInput(input);
    const c = await classify(tx, ctx, ids, patch, input.if_versions);
    const assignee = patch.assignee ? await who(tx, this.members, patch.assignee.kind === 'user' ? patch.assignee.id : null, patch.assignee.kind === 'agent' ? patch.assignee.id : null) : undefined;
    const n = c.eligible.length;
    const skipped = defined({ not_found: c.not_found || undefined, read_only: c.read_only || undefined, closed: c.closed || undefined, stale: c.stale || undefined, unchanged: c.unchanged || undefined, duplicates: duplicates || undefined });
    return preview('write', `${n}`, {
      count: n,
      changes: [{ entity: 'ticket', after: defined({ assignee: assignee ?? undefined, priority: patch.priority }) }, ...(Object.keys(skipped).length ? [{ entity: 'ticket_bulk', after: skipped }] : [])],
      // Giao agent chỉ là phân công: agent không tự chạy / xử lý ticket vì thao tác này.
      ...(patch.assignee?.kind === 'agent' || n > BULK_SYNC_MAX ? { warnings: [...(patch.assignee?.kind === 'agent' ? ['agent_assignment_not_run'] : []), ...(n > BULK_SYNC_MAX ? ['bulk_background'] : [])] } : {}),
    });
  }

  /** Version đã nhận của từng ticket hợp lệ lúc xem trước — ràng vào token (không đi qua client). */
  async bindPreview(ctx: ActionContext, input: In, tx: TenantTx): Promise<Record<string, number>> {
    const { ids, patch } = admitInput(input);
    const c = await classify(tx, ctx, ids, patch, input.if_versions);
    return Object.fromEntries(c.eligible.map((e) => [vKey(e.id), e.version]));
  }

  async execute(ctx: ActionContext, input: In, tx: TenantTx, _p?: unknown, _prep?: unknown, meta?: ExecuteMeta): Promise<HandlerOutcome<TicketBulkResult>> {
    const { ids, duplicates, patch } = admitInput(input);
    const actor = actorUserId(ctx);
    if (!actor || !meta) throw new AppError('FORBIDDEN', 403, { actor: 'user_required' });
    // Người nhận sai từ đầu → 422 trước mọi hiệu ứng (mỗi con vẫn kiểm lại người nhận HIỆN TẠI).
    if (patch.assignee) await recipientCols(ctx.workspaceId, tx, this.members, patch.assignee);
    const now = this.d.now();
    const targets = ids.filter((id) => UUID.test(id));
    const admitted = new Map<string, number>();
    for (const id of targets) {
      const v = input.if_versions?.[id] ?? ctx.previewFacts?.[vKey(id)];
      if (typeof v === 'number') admitted.set(id, v);
    }
    const job: BulkJobInput = { ids, patch, duplicates };
    const jobId = await createJob(tx, { kind: TICKET_BULK_KIND, actionId: 'ticket.bulk_update', actorId: actor, actionLogId: meta.actionLogId, input: job, targets, admitted, now });
    const row = { id: jobId, status: 'queued', total: targets.length, input: job };
    const result = await bulkResultOf(tx, row);
    const after = { job_id: jobId, total: targets.length, fields: Object.keys(defined({ assignee: patch.assignee, priority: patch.priority })) };
    if (targets.length > BULK_SYNC_MAX) {
      return { result, after, events: [{ topic: 'data_job.requested', payload: { job_id: jobId, kind: TICKET_BULK_KIND } }], ...jobAccepted(jobId, dataJobUrl(jobId)) };
    }
    const ws = ctx.workspaceId;
    return {
      result,
      after,
      // Con chạy SAU commit cha (không trong transaction cha). Sập giữa chừng → quét data_job chạy tiếp từ biên nhận.
      afterCommit: async () => {
        const db = await this.d.db(ws, 'ticket.bulk_update');
        await runDataJob(db, ws, jobId, { authzOf: (w, u) => this.d.authzOf(w, u), allowed: allowedAction, now: this.d.now, owner: OWNER });
      },
      settled: async () => {
        const db = await this.d.db(ws, 'ticket.bulk_update');
        const j = await db.dataJob.findUniqueOrThrow({ where: { id: jobId }, select: { id: true, status: true, total: true, input: true } });
        return bulkResultOf(db, j);
      },
    };
  }

  /** Không bao giờ chạy qua UndoService cũ (registry chặn trước → 409 UNDO_REQUIRES_ACTION) — phòng thủ kép. */
  async undo(_ctx: ActionContext, log: { id: string }): Promise<void> {
    throw new AppError('UNDO_REQUIRES_ACTION', 409, { undo_action: 'ticket.bulk_undo', parent_action_log_id: log.id });
  }
}
