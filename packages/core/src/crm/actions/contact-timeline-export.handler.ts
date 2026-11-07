// contact.history_export (TIP-025b §D.6, crm.export, risk read — không preview theo DC-063): lịch sử MỘT khách người gọi thấy được ra
// CSV. Tập id chốt theo bộ lọc; ≤ 5.000 dòng trả ngay, > 5.000 → 202 việc nền `data_job` + tải 24 giờ qua /v1/data-jobs/:id/download
// (route kiểm lại quyền + còn thấy khách). Cùng một đường cho nút CSV (không model / Credit) và Trợ lý.
import { Inject, Injectable } from '@nestjs/common';
import { EXPORT_SYNC_MAX } from '@appchat/shared';
import type { ActionInput, contactTimelineExport } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { createJob } from '../../kernel/jobs/data-jobs/store';
import { dataJobUrl } from '../../kernel/jobs/data-jobs/handlers';
import { jobAccepted } from '../../kernel/actions/job-accepted';
import { actorUserId, visibleContact } from '../services/access';
import { CrmMembers } from '../services/members.service';
import { TIMELINE_COLUMNS, snapshotTimelineIds, timelineFileName, timelineHead, timelineLines, timelineStamp } from '../services/contact-timeline-export';
import { TIMELINE_EXPORT_KIND, type TimelineJobInput } from '../jobs/contact-timeline-export.processor';

type In = ActionInput<typeof contactTimelineExport>;
type Out = { file_name: string; mime: 'text/csv'; rows: number; total: number; excluded: number; content: string };

@Injectable()
@ActionHandler('contact.history_export')
export class ContactTimelineExportHandler implements Handler<In, Out> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: In, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const { contact } = await visibleContact(tx, ctx.authz, input.contact_id);
    const me = actorUserId(ctx);
    const { locale, timeZone } = await this.members.place(ctx.workspaceId, me);
    const ids = await snapshotTimelineIds(tx, { contactId: contact.id, from: input.from, to: input.to, types: input.types, order: input.order }, timeZone);
    const now = this.clock.now();
    const cols = input.columns ?? [...TIMELINE_COLUMNS];
    const file = timelineFileName(contact.code, locale, now);
    if (ids.length > EXPORT_SYNC_MAX) {
      const job: TimelineJobInput = { contact_id: contact.id, columns: cols, time_zone: timeZone, locale, file_name: file };
      const id = await createJob(tx, { kind: TIMELINE_EXPORT_KIND, actionId: 'contact.history_export', actorId: me, actionLogId: null, input: { ...input, ...job }, targets: ids, fieldPolicy: timelineStamp(ctx.authz), now });
      return {
        result: { file_name: file, mime: 'text/csv', rows: ids.length, total: ids.length, excluded: 0, content: '' },
        after: { job_id: id, total: ids.length },
        events: [{ topic: 'data_job.requested', payload: { job_id: id, kind: TIMELINE_EXPORT_KIND } }],
        ...jobAccepted(id, dataJobUrl(id)),
      };
    }
    const r = await timelineLines(tx, contact.id, ids, { cols, locale, timeZone, members: this.members });
    return { result: { file_name: file, mime: 'text/csv', rows: r.lines.length, total: ids.length, excluded: r.withheld, content: [timelineHead(cols, locale, timeZone), ...r.lines].join('\r\n') } };
  }
}
