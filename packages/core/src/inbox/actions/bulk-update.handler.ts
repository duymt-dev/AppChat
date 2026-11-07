// conversation.bulk_update (TIP-025b §C.2–3, concurrency §7 — cùng khung contact.bulk_update 045b). Tập id CHỐT theo người chọn (trùng bỏ,
// giữ thứ tự, ≤ 100). Đổi người phụ trách cần thêm `inbox.assign`. ≤ 50: trong transaction executor, mỗi hội thoại một SAVEPOINT — lỗi một
// hội thoại (không thấy / chỉ đọc) chỉ lùi hội thoại đó, trả kết quả TỪNG id (mã an toàn, không tiêu đề). > 50: `data_job` + biên nhận từng
// id + `data_job.requested` cùng commit → 202 `job_accepted`; worker kiểm lại quyền hiện tại của người tạo, mỗi hội thoại một transaction
// cùng biên nhận (inbox-bulk.processor). Thẻ mới tạo MỘT lần ở cấp lô. Undo (chạy ngay): mỗi trường chỉ khôi phục khi vẫn là giá trị lô đã
// đặt — người khác đã đổi sau đó thì giữ thay đổi mới (xung đột từng id, không ghi đè cả ảnh chụp cũ).
import { Inject, Injectable } from '@nestjs/common';
import { AppError, BULK_SYNC_MAX, can } from '@appchat/shared';
import type { ActionInput, ActionPreview, conversationBulkUpdate } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { jobAccepted } from '../../kernel/actions/job-accepted';
import { createJob } from '../../kernel/jobs/data-jobs/store';
import { dataJobUrl } from '../../kernel/jobs/data-jobs/handlers';
import { CrmMembers } from '../../crm/public';
import { UUID, writableConversation } from '../services/access';
import { applyBulkChange, type BulkChange, type BulkItemBefore } from '../services/conversation-mutations';
import { me, tagByLabel } from './kit';
import { bulkPreview } from './previews/conversation-assign.handlers.preview';
import { bulkUndo } from '../bulk/bulk-undo';

type In = ActionInput<typeof conversationBulkUpdate>;
export type BulkItem = { id: string; status: 'done' | 'skipped' | 'failed'; error: string | null };
type Out = { updated: number; failed: number; items: BulkItem[] };

export const INBOX_BULK_KIND = 'conversation.bulk_update';
const uniq = (ids: string[]) => [...new Set(ids)];

/** Mã lỗi an toàn của một bản ghi (mã + tên trường, không dữ liệu); lỗi không phải AppError → ném tiếp (lỗi hạ tầng không nuốt). */
export const bulkErrorOf = (e: unknown) => {
  const x = e as { code?: string; fields?: Record<string, unknown> };
  if (!x.code) throw e;
  return `${x.code}${x.fields ? `:${Object.keys(x.fields).join(',')}` : ''}`;
};

function assertAssign(ctx: ActionContext, input: In) {
  if (input.assignee_user_id && !can(ctx.authz, 'inbox.assign')) throw new AppError('FORBIDDEN', 403, { permission: 'inbox.assign' });
}

@Injectable()
@ActionHandler('conversation.bulk_update')
export class ConversationBulkUpdateHandler implements Handler<In, Out> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** Đếm hội thoại người gọi sửa được; id không sửa được chỉ báo số (không tên). Không sửa được id nào → lỗi như hội thoại đơn. */
  async preview(ctx: ActionContext, input: In, tx: TenantTx): Promise<ActionPreview> {
    assertAssign(ctx, input);
    const ids = uniq(input.conversation_ids);
    let ok = 0;
    let first: unknown = null;
    for (const id of ids.slice(0, BULK_SYNC_MAX * 2)) {
      try {
        await writableConversation(tx, ctx.authz, id);
        ok++;
      } catch (e) {
        bulkErrorOf(e);
        first ??= e;
      }
    }
    if (!ok && first) throw first;
    const p = await bulkPreview(ok, this.members, input);
    const denied = ids.length - ok;
    const warnings = [...(p.warnings ?? []), ...(denied ? [`denied:${denied}`] : []), ...(ids.length > BULK_SYNC_MAX ? ['mode:job'] : [])];
    return warnings.length ? { ...p, warnings } : p;
  }

  async execute(ctx: ActionContext, input: In, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    assertAssign(ctx, input);
    const ids = uniq(input.conversation_ids);
    const now = this.clock.now();
    if (input.assignee_user_id) await this.members.assertMember(ctx.workspaceId, input.assignee_user_id, 'assignee_user_id');
    const tagIds: string[] = [];
    for (const label of input.add_tags ?? []) tagIds.push((await tagByLabel(tx, label, me(ctx), now, true))!.id);
    const change: BulkChange = { assignee_user_id: input.assignee_user_id, status: input.status, archive: input.archive, tagIds };
    if (ids.length > BULK_SYNC_MAX) {
      // Id không phải uuid không vào việc nền — kết quả lỗi ngay (cùng mã với hội thoại không thấy).
      const targets = ids.filter((id) => UUID.test(id));
      const job = await createJob(tx, { kind: INBOX_BULK_KIND, actionId: 'conversation.bulk_update', actorId: me(ctx), actionLogId: null, input: { change }, targets, now });
      const invalid = ids.filter((x) => !UUID.test(x)).map((x): BulkItem => ({ id: x, status: 'failed', error: 'NOT_FOUND:conversation_id' }));
      return {
        result: { updated: 0, failed: invalid.length, items: invalid },
        before: { job_id: job },
        after: { job_id: job, total: targets.length },
        events: [{ topic: 'data_job.requested', payload: { job_id: job, kind: INBOX_BULK_KIND } }],
        ...jobAccepted(job, dataJobUrl(job)),
      };
    }
    const items: BulkItem[] = [];
    const befores: BulkItemBefore[] = [];
    const events = [];
    for (const [i, id] of ids.entries()) {
      await tx.$executeRawUnsafe(`SAVEPOINT cbulk_${i}`);
      try {
        const c = await writableConversation(tx, ctx.authz, id);
        const r = await applyBulkChange(tx, c, change, now);
        await tx.$executeRawUnsafe(`RELEASE SAVEPOINT cbulk_${i}`);
        items.push({ id, status: r.status, error: null });
        if (r.status === 'done') befores.push(r.before);
        events.push(...r.events);
      } catch (e) {
        await tx.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT cbulk_${i}`);
        items.push({ id, status: 'failed', error: bulkErrorOf(e) });
      }
    }
    const updated = items.filter((x) => x.status === 'done').length;
    return { result: { updated, failed: items.filter((x) => x.status === 'failed').length, items }, before: { items: befores, change }, events };
  }

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const b = log.before as { job_id?: string; items?: BulkItemBefore[]; change?: BulkChange };
    if (b.job_id) throw new AppError('INVALID_STATE', 409, { undo: 'job_bulk' });
    await bulkUndo(tx, ctx.authz, b.items ?? [], b.change ?? {});
  }
}
