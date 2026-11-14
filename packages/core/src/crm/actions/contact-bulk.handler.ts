// contact.bulk_update (TIP-045b annex D, concurrency §7). Tập id CHỐT theo người chọn (trùng bỏ, giữ thứ tự). ≤ 50: chạy trong transaction
// của executor, mỗi khách một SAVEPOINT — lỗi một khách (ngoài scope / watcher / trường không hợp lệ) chỉ lùi khách đó, trả kết quả TỪNG
// bản ghi. > 50: ghi `data_job` + biên nhận từng id + event `data_job.requested` cùng commit → 202 `job_accepted`; worker kiểm lại quyền
// hiện tại của người tạo trước mỗi lô, mỗi khách một transaction cùng biên nhận (chạy lại / hai worker không ghi lần hai).
import { Inject, Injectable } from '@nestjs/common';
import { BULK_SYNC_MAX, fieldRoleOf } from '@appchat/shared';
import type { ActionInput, contactBulkUpdate } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { jobAccepted } from '../../kernel/actions/job-accepted';
import { line, preview } from '../../kernel/actions/preview-kit';
import { createJob } from '../../kernel/jobs/data-jobs/store';
import { dataJobUrl } from '../../kernel/jobs/data-jobs/handlers';
import { actorUserId, UUID } from '../services/access';
import { applyBulkPatch } from '../services/contact-bulk';

type In = ActionInput<typeof contactBulkUpdate>;
type Item = { id: string; status: 'done' | 'failed' | 'skipped'; error: string | null };
type Out = { updated: number; failed: number; items: Item[] };

export const CONTACT_BULK_KIND = 'contact.bulk_update';
const uniq = (ids: string[]) => [...new Set(ids)];
const errorOf = (e: unknown) => {
  const x = e as { code?: string; fields?: Record<string, unknown> };
  if (!x.code) throw e;
  return `${x.code}${x.fields ? `:${Object.keys(x.fields).join(',')}` : ''}`;
};

@Injectable()
@ActionHandler('contact.bulk_update')
export class ContactBulkUpdateHandler implements Handler<In, Out> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async preview(_ctx: ActionContext, input: In) {
    const ids = uniq(input.contact_ids);
    const fields = Object.keys(input.patch).filter((k) => (input.patch as Record<string, unknown>)[k] !== undefined);
    return preview('write', line(`${ids.length}`, fields.join(', ')), { count: ids.length, changes: [{ entity: 'contact', after: { ...input.patch, mode: ids.length > BULK_SYNC_MAX ? 'job' : 'sync' } }] });
  }

  async execute(ctx: ActionContext, input: In, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const ids = uniq(input.contact_ids);
    const now = this.clock.now();
    const me = actorUserId(ctx);
    if (ids.length > BULK_SYNC_MAX) {
      // Id lạ (không phải uuid) không vào việc nền — ghi kết quả lỗi ngay, không chiếm biên nhận.
      const targets = ids.filter((id) => UUID.test(id));
      const id = await createJob(tx, { kind: CONTACT_BULK_KIND, actionId: 'contact.bulk_update', actorId: me, actionLogId: null, input: { patch: input.patch }, targets, now });
      const invalid = ids.filter((x) => !UUID.test(x)).map((x): Item => ({ id: x, status: 'failed', error: 'NOT_FOUND:contact_id' }));
      return {
        result: { updated: 0, failed: invalid.length, items: invalid },
        // action_log.after mang job_id (truy vết việc ↔ yêu cầu; executor không chuyển id log vào handler).
        after: { job_id: id, total: targets.length },
        events: [{ topic: 'data_job.requested', payload: { job_id: id, kind: CONTACT_BULK_KIND } }],
        ...jobAccepted(id, dataJobUrl(id)),
      };
    }
    const actor = { authz: ctx.authz, fieldRole: fieldRoleOf(ctx.authz), userId: me, now };
    const items: Item[] = [];
    for (const [i, id] of ids.entries()) {
      await tx.$executeRawUnsafe(`SAVEPOINT bulk_${i}`);
      try {
        items.push({ id, status: await applyBulkPatch(tx, actor, id, input.patch), error: null });
        await tx.$executeRawUnsafe(`RELEASE SAVEPOINT bulk_${i}`);
      } catch (e) {
        await tx.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT bulk_${i}`);
        items.push({ id, status: 'failed', error: errorOf(e) });
      }
    }
    const updated = items.filter((x) => x.status === 'done').length;
    return { result: { updated, failed: items.filter((x) => x.status === 'failed').length, items }, after: { ids: items.filter((x) => x.status === 'done').map((x) => x.id) } };
  }
}
