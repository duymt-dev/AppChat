// contact.export (crm.export, risk read — chạy ngay, không preview theo policy §3.3 (DC-063); CSV đúng scope) · contact.import (crm.import, bulk → preview, theo lô ≤ 500,
// chống giành khách: dòng trùng khách của người khác chỉ đếm, không lộ dữ liệu). contact.send_email ở inbox (gửi qua kênh Email — TIP-018).
import { Inject, Injectable } from '@nestjs/common';
import { SOURCE_STYLE, createFmt, interpolate, normalizePhone, serverMessages, type ContactSource } from '@appchat/shared';
import type { ActionPreview, ActionInput, contactExport, contactImport } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { actorUserId } from '../services/access';
import { createContact } from '../services/contacts.service';
import { listContactIds } from '../repos/contacts.repo';
import { CrmMembers } from '../services/members.service';

type ExportIn = ActionInput<typeof contactExport>;
type ExportOut = { file_name: string; mime: 'text/csv'; rows: number; content: string };

const csvCell = (v: string) => (/[",\n\r]/.test(v) || /^[=+\-@]/.test(v) ? `"${(/^[=+\-@]/.test(v) ? `'${v}` : v).replace(/"/g, '""')}"` : v);

@Injectable()
@ActionHandler('contact.export')
export class ContactExportHandler implements Handler<ExportIn, ExportOut> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  private filter(i: ExportIn) {
    return { stage: i.stage, ownerId: i.owner_id, q: i.q, mine: i.mine };
  }

  async execute(ctx: ActionContext, input: ExportIn, tx: TenantTx): Promise<HandlerOutcome<ExportOut>> {
    const { ids } = await listContactIds(tx, ctx.authz, this.filter(input), null);
    const rows = await tx.contact.findMany({ where: { id: { in: ids } }, select: { id: true, code: true, name: true, phone: true, email: true, stage: true, ownerUserId: true, city: true, source: true, createdAt: true } });
    const order = new Map(ids.map((id, i) => [id, i]));
    rows.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
    const names = await this.members.names(rows.map((r) => r.ownerUserId));
    const locale = 'vi';
    const m = serverMessages(locale).crm;
    const fmt = createFmt({ locale });
    const head = [m.export.code, m.export.name, m.export.phone, m.export.email, m.export.stage, m.export.owner, m.export.city, m.export.source, m.export.created];
    const lines = rows.map((r) =>
      [r.code, r.name, r.phone ?? '', r.email ?? '', m.stage[r.stage], r.ownerUserId ? (names.get(r.ownerUserId) ?? '') : '', r.city ?? '', (SOURCE_STYLE[r.source as ContactSource] ?? SOURCE_STYLE.manual).label, fmt.date(r.createdAt)]
        .map(csvCell)
        .join(','),
    );
    const day = this.clock.now().toISOString().slice(0, 10);
    // BOM để Excel mở đúng UTF-8 tiếng Việt.
    return { result: { file_name: `khach-hang-${day}.csv`, mime: 'text/csv', rows: rows.length, content: `﻿${[head.join(','), ...lines].join('\r\n')}` } };
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

  /** Phân loại dòng: thiếu SĐT + email / email sai → invalid; trùng trong file hoặc với khách có sẵn → dup / owned. */
  private async classify(ctx: ActionContext, rows: ImportIn['rows'], tx: TenantTx) {
    const me = actorUserId(ctx);
    const seen = new Set<string>();
    const out: { row: ImportIn['rows'][number]; kind: 'create' | 'dup' | 'owned' | 'invalid' }[] = [];
    for (const row of rows) {
      const phone = normalizePhone(row.phone);
      const email = row.email?.trim().toLowerCase() || null;
      if ((!phone && !email) || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
        out.push({ row, kind: 'invalid' });
        continue;
      }
      const keys = [phone && `p:${phone}`, email && `e:${email}`].filter((k): k is string => !!k);
      if (keys.some((k) => seen.has(k))) {
        out.push({ row, kind: 'dup' });
        continue;
      }
      keys.forEach((k) => seen.add(k));
      const or = [...(phone ? [{ phoneNorm: phone }] : []), ...(email ? [{ email }] : [])];
      const hit = await tx.contact.findFirst({ where: { deletedAt: null, OR: or }, select: { ownerUserId: true } });
      out.push({ row, kind: !hit ? 'create' : hit.ownerUserId && hit.ownerUserId !== me ? 'owned' : 'dup' });
    }
    return out;
  }

  async preview(ctx: ActionContext, input: ImportIn, tx: TenantTx): Promise<ActionPreview> {
    const c = await this.classify(ctx, input.rows, tx);
    const n = (k: string) => c.filter((x) => x.kind === k).length;
    return {
      summary: interpolate(serverMessages('vi').crm.preview.import, { count: c.length, created: n('create'), dup: n('dup'), owned: n('owned'), invalid: n('invalid') }),
      risk: 'write',
      count: n('create'),
    };
  }

  async execute(ctx: ActionContext, input: ImportIn, tx: TenantTx): Promise<HandlerOutcome<ImportOut>> {
    const now = this.clock.now();
    const me = actorUserId(ctx);
    const roleKey = await this.members.roleOf(ctx.workspaceId, me);
    const rows = await this.classify(ctx, input.rows, tx);
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
