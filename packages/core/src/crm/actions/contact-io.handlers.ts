// contact.export (crm.export, risk read — không preview theo policy §3.3 (DC-063); CSV đúng scope; ≤ 5.000 dòng trả ngay, > 5.000 → 202 việc nền
// `data_job` + tệp tải có hạn — TIP-045b annex D) · contact.import (crm.import, bulk → preview, theo lô ≤ 500,
// chống giành khách: dòng trùng khách của người khác chỉ đếm, không lộ dữ liệu). contact.send_email ở inbox (gửi qua kênh Email — TIP-018).
import { Inject, Injectable } from '@nestjs/common';
import { EXPORT_SYNC_MAX } from '@appchat/shared';
import type { ActionPreview, ActionInput, contactExport, contactImport } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { assertQueryFields, fieldView } from '../../authz/public';
import { actorUserId } from '../services/access';
import { createContact } from '../services/contacts.service';
import { snapshotContactIds, type ContactFilter } from '../repos/contacts.repo';
import { csvHead, csvLines, exportFileName } from '../services/contact-export';
import { CONTACT_EXPORT_KIND } from '../jobs/contact-export.processor';
import { createJob } from '../../kernel/jobs/data-jobs/store';
import { dataJobUrl } from '../../kernel/jobs/data-jobs/handlers';
import { policyStamp } from '../../kernel/jobs/bulk-status';
import { jobAccepted } from '../../kernel/actions/job-accepted';
import { CrmMembers } from '../services/members.service';
import { classifyImport, importPreview } from './previews/contact-io.handlers.preview';

type ExportIn = ActionInput<typeof contactExport>;
type ExportOut = { file_name: string; mime: 'text/csv'; rows: number; content: string };

@Injectable()
@ActionHandler('contact.export')
export class ContactExportHandler implements Handler<ExportIn, ExportOut> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** Cùng bộ lọc + thứ tự với danh sách (TIP-026 — trước chỉ stage / q / owner / mine). */
  private filter(i: ExportIn): ContactFilter {
    return { stage: i.stage, ownerId: i.owner_id, q: i.q, mine: i.mine, status: i.status, group: i.group, source: i.source, tagId: i.tag_id, custom: i.custom, sort: i.sort };
  }

  async execute(ctx: ActionContext, input: ExportIn, tx: TenantTx): Promise<HandlerOutcome<ExportOut>> {
    // Lọc `cf.*` trên trường bị ẩn → 422 (số dòng xuất cũng là kênh dò giá trị — TIP-045b annex C).
    const fv = await fieldView(tx, 'contact', ctx.authz);
    assertQueryFields(fv, input.custom);
    // Chốt TOÀN BỘ tập id (không cắt ngầm 5.000 — TIP-045b annex D); > 5.000 → việc nền + tệp tải qua /v1/data-jobs/:id/download.
    const ids = await snapshotContactIds(tx, ctx.authz, this.filter(input));
    const now = this.clock.now();
    if (ids.length > EXPORT_SYNC_MAX) {
      const id = await createJob(tx, { kind: CONTACT_EXPORT_KIND, actionId: 'contact.export', actorId: actorUserId(ctx), actionLogId: null, input, targets: ids, fieldPolicy: policyStamp(fv), now });
      return {
        result: { file_name: exportFileName(now), mime: 'text/csv', rows: ids.length, content: '' },
        after: { job_id: id, total: ids.length },
        events: [{ topic: 'data_job.requested', payload: { job_id: id, kind: CONTACT_EXPORT_KIND } }],
        ...jobAccepted(id, dataJobUrl(id)),
      };
    }
    const { lines } = await csvLines(tx, ctx.authz, this.members, ids);
    return { result: { file_name: exportFileName(now), mime: 'text/csv', rows: lines.length, content: [csvHead(), ...lines].join('\r\n') } };
  }
}

type ImportIn = ActionInput<typeof contactImport>;
type ImportOut = { created: number; duplicates: number; owned: number; invalid: number; contact_ids: string[] };

@Injectable()
@ActionHandler('contact.import')
export class ContactImportHandler implements Handler<ImportIn, ImportOut> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async preview(ctx: ActionContext, input: ImportIn, tx: TenantTx): Promise<ActionPreview> {
    return importPreview(ctx, tx, input);
  }

  async execute(ctx: ActionContext, input: ImportIn, tx: TenantTx): Promise<HandlerOutcome<ImportOut>> {
    const now = this.clock.now();
    const me = actorUserId(ctx);
    const roleKey = await this.members.roleOf(ctx.workspaceId, me);
    const rows = await classifyImport(ctx, input.rows, tx);
    const ids: string[] = [];
    for (const r of rows.filter((x) => x.kind === 'create')) {
      const { source, ...rest } = r.row;
      const c = await createContact(tx, rest, { workspaceId: ctx.workspaceId, authz: ctx.authz, roleKey, actorUserId: me, now, members: this.members, skipRequiredCustom: true });
      if (source && source !== 'manual') await tx.contact.update({ where: { id: c.id }, data: { source } });
      ids.push(c.id);
    }
    const n = (k: string) => rows.filter((x) => x.kind === k).length;
    return {
      result: { created: ids.length, duplicates: n('dup'), owned: n('owned'), invalid: n('invalid'), contact_ids: ids },
      after: { ids },
      events: ids.map((id) => ({ topic: 'contact.created', payload: { contact_id: id, owner_user_id: me, source: 'manual' } })),
    };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    await tx.contact.deleteMany({ where: { id: { in: (log.after as { ids: string[] }).ids } } });
  }
}
