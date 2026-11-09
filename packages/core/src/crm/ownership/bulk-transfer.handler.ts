// `contact.transfer_owner_bulk` (TIP-015d §2.6, 045b annex D): tập id CHỐT (trùng bỏ, giữ thứ tự), cùng người nhận + cờ chuyển kèm.
// Công thức con = đúng `transferContact` của contact.transfer_owner cho TỪNG khách (khoá gốc, scope ghi sau khoá, biên nhận, timeline,
// event → thông báo hai bên). ≤ 50: trong transaction của executor, mỗi khách một SAVEPOINT — lỗi một khách chỉ lùi khách đó; > 50:
// `data_job` + biên nhận từng id, worker kiểm lại quyền HIỆN TẠI của người tạo trước mỗi lô, mỗi khách một transaction cùng biên nhận.
// Nguồn Trợ lý / agent / tác vụ luôn qua duyệt (requiredApprovalSources). Không hoàn tác gộp — mỗi lần chuyển có biên nhận riêng.
import { Inject, Injectable } from '@nestjs/common';
import { BULK_SYNC_MAX } from '@appchat/shared';
import type { ActionInput, contactTransferOwnerBulk } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, ActionSource, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { jobAccepted } from '../../kernel/actions/job-accepted';
import { line, preview } from '../../kernel/actions/preview-kit';
import { registerDataJobKind } from '../../kernel/jobs/bulk-dispatch';
import { createJob } from '../../kernel/jobs/data-jobs/store';
import { dataJobUrl } from '../../kernel/jobs/data-jobs/handlers';
import { writeOutbox } from '../../kernel/outbox/outbox';
import { actorUserId, UUID } from '../services/access';
import { CrmMembers } from '../services/members.service';
import { transferContact, type TransferInput } from './transfer.service';

type In = ActionInput<typeof contactTransferOwnerBulk>;
type Item = { id: string; status: 'transferred' | 'skipped_already_owner' | 'failed'; transfer_id: string | null; error: string | null };
type Out = { transferred: number; skipped: number; failed: number; items: Item[] };
/** Input lưu trong data_job: người nhận đã kiểm là thành viên lúc yêu cầu (worker kiểm lại), nguồn gốc để ghi biên nhận đúng. */
type JobInput = { to_user_id: string; to_name: string; move: TransferInput['move']; source: ActionSource };

export const CONTACT_TRANSFER_BULK_KIND = 'contact.transfer_owner_bulk';
const uniq = (ids: string[]) => [...new Set(ids)];
const errorOf = (e: unknown) => {
  const x = e as { code?: string; fields?: Record<string, unknown> };
  if (!x.code) throw e;
  return `${x.code}${x.fields ? `:${Object.keys(x.fields).join(',')}` : ''}`;
};
const tally = (items: Item[]): Out => ({
  transferred: items.filter((x) => x.status === 'transferred').length,
  skipped: items.filter((x) => x.status === 'skipped_already_owner').length,
  failed: items.filter((x) => x.status === 'failed').length,
  items,
});

/** Kind việc nền: một khách = một lần chuyển trong transaction của runner (cùng biên nhận), event ghi cùng commit. */
export function registerTransferBulkKind(members: Pick<CrmMembers, 'assertMember'>) {
  registerDataJobKind(CONTACT_TRANSFER_BULK_KIND, {
    label: 'Chuyển phụ trách hàng loạt',
    link: dataJobUrl,
    item: async (c, tx, targetId) => {
      const j = c.job.input as JobInput;
      // Người nhận bị gỡ giữa chừng → mọi khách còn lại lỗi (không chuyển cho người không còn trong workspace).
      const to = await members.assertMember(c.ws, j.to_user_id, 'to_user_id');
      const ctx: ActionContext = { workspaceId: c.ws, source: j.source, actor: { type: 'user', id: c.job.actorId ?? '' }, authz: c.authz };
      const o = await transferContact(ctx, tx, { contact_id: targetId, to_user_id: to.id, move: j.move }, to, c.now());
      await writeOutbox(tx, c.ws, o.events, c.now());
      return o.result.status === 'transferred' ? 'done' : 'skipped';
    },
  });
}

@Injectable()
@ActionHandler('contact.transfer_owner_bulk')
export class ContactTransferOwnerBulkHandler implements Handler<In, Out> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async preview(_ctx: ActionContext, input: In) {
    const ids = uniq(input.contact_ids);
    return preview('write', line(`${ids.length}`, input.to_user_id), { count: ids.length, changes: [{ entity: 'contact', after: { owner_user_id: input.to_user_id, move: input.move, mode: ids.length > BULK_SYNC_MAX ? 'job' : 'sync' } }] });
  }

  async execute(ctx: ActionContext, input: In, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const ids = uniq(input.contact_ids);
    const now = this.clock.now();
    const to = await this.members.assertMember(ctx.workspaceId, input.to_user_id, 'to_user_id');
    if (ids.length > BULK_SYNC_MAX) {
      const targets = ids.filter((id) => UUID.test(id));
      const job: JobInput = { to_user_id: to.id, to_name: to.name, move: input.move, source: ctx.source };
      const id = await createJob(tx, { kind: CONTACT_TRANSFER_BULK_KIND, actionId: 'contact.transfer_owner_bulk', actorId: actorUserId(ctx), actionLogId: null, input: job, targets, now });
      const invalid = ids.filter((x) => !UUID.test(x)).map((x): Item => ({ id: x, status: 'failed', transfer_id: null, error: 'NOT_FOUND:contact_id' }));
      return {
        result: tally(invalid),
        after: { job_id: id, total: targets.length },
        events: [{ topic: 'data_job.requested', payload: { job_id: id, kind: CONTACT_TRANSFER_BULK_KIND } }],
        ...jobAccepted(id, dataJobUrl(id)),
      };
    }
    const items: Item[] = [];
    const events: { topic: string; payload: Record<string, unknown> }[] = [];
    for (const [i, id] of ids.entries()) {
      await tx.$executeRawUnsafe(`SAVEPOINT xfer_${i}`);
      try {
        const o = await transferContact(ctx, tx, { contact_id: id, to_user_id: to.id, move: input.move, note: input.note }, to, now);
        await tx.$executeRawUnsafe(`RELEASE SAVEPOINT xfer_${i}`);
        items.push({ id, status: o.result.status, transfer_id: o.result.transfer_id, error: null });
        events.push(...o.events);
      } catch (e) {
        await tx.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT xfer_${i}`);
        items.push({ id, status: 'failed', transfer_id: null, error: errorOf(e) });
      }
    }
    const transfers = items.filter((x) => x.transfer_id).map((x) => ({ id: x.id, transfer_id: x.transfer_id }));
    return { result: tally(items), after: { transfers }, events, noUndo: true };
  }
}
