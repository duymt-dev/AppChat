// Action phụ của marketing (TIP-037): gửi thử cho CHÍNH người bấm (email đăng nhập của họ — không gửi tới khách bất kỳ, không tính số đo /
// khoá 48 giờ), tạo nháp gửi lại cho người nhận chưa có bằng chứng đã đọc / trả lời (KHÔNG gửi — vẫn qua duyệt + 48 giờ), nhập danh sách
// (lô id khách thật), xuất người nhận CSV (scope hiện tại, tệp có đăng nhập).
import { Inject, Injectable } from '@nestjs/common';
import { TenantContexts } from '@appchat/db';
import { AppError, can, type CampaignChannel } from '@appchat/shared';
import type { ActionInput, ActionPreview, campaignAudienceImport, campaignRecipientExport, campaignResendUnread, campaignSendTest } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { created, line, preview } from '../../kernel/actions/preview-kit';
import { checkFile } from '../../kernel/files/file-access';
import { uuidv7 } from '../../kernel/ids';
import { nextCode } from '../../kernel/sequence';
import { CrmMembers, actorUserId, createContact } from '../../crm/public';
import { IMPORT_FILE_RULE } from '../../catalog/import/import.handler';
import { actorOf, changed, findCampaign, lockCampaign, logEvent } from '../repos/campaigns.repo';
import { classifyRows, countKinds, parseRows, rowErrors } from '../services/audience-import';
import { CHANNEL_CAPS, renderContent, type CampaignContent } from '../services/campaign-policy';
import { MarketingDeps } from '../services/marketing-deps';
import { exportRows } from '../services/recipient-export';
import { queueMailTest } from '../services/mail-test';

@Injectable()
@ActionHandler('campaign.send_test')
export class CampaignSendTestHandler implements Handler<ActionInput<typeof campaignSendTest>, { sent_to: string; delivery_ref?: string }> {
  constructor(
    @Inject(MarketingDeps) private readonly d: MarketingDeps,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async preview(ctx: ActionContext, input: ActionInput<typeof campaignSendTest>, tx: TenantTx): Promise<ActionPreview> {
    const c = await findCampaign(tx, input.campaign_id);
    const me = await this.d.userEmail(actorUserId(ctx));
    return preview('send', line(c.code, c.name, me?.email), { count: 1 });
  }

  /** Thư thử tới email của người bấm qua tài khoản email đang kết nối (hàng gửi chung — tính tốc độ, không tính trần chủ động / số đo). */
  async execute(ctx: ActionContext, input: ActionInput<typeof campaignSendTest>, tx: TenantTx): Promise<HandlerOutcome<{ sent_to: string; delivery_ref?: string }>> {
    const c = await findCampaign(tx, input.campaign_id);
    const me = await this.d.userEmail(actorUserId(ctx));
    if (!me?.email) throw new AppError('VALIDATION_FAILED', 422, { user: 'no_email' });
    // TIP-012c: mail của DN — biên nhận gửi thử riêng qua đúng kết nối đã chọn (không qua tài khoản kênh, không thống kê chiến dịch).
    if (c.senderKind === 'tenant_mail') return queueMailTest(tx, ctx.workspaceId, c, { userId: actorUserId(ctx)!, email: me.email, name: me.name }, this.clock.now());
    const acc = c.channel === 'email' && c.accountId ? await tx.channelAccount.findUnique({ where: { id: c.accountId } }) : await tx.channelAccount.findFirst({ where: { type: 'email', status: 'connected', pausedAt: null }, orderBy: { createdAt: 'asc' } });
    if (!acc || acc.type !== 'email' || acc.status !== 'connected' || acc.pausedAt) throw new AppError('INVALID_STATE', 409, { connector: 'email' });
    if (!this.d.send) throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'Hàng gửi chưa cấu hình');
    const content = c.content as unknown as CampaignContent;
    const vars = { ten: me.name, ma_khach: null, hang: null };
    const now = this.clock.now();
    const ref = `ct_${uuidv7(now.getTime())}`;
    const subject = `[TEST] ${renderContent(content.subject ?? c.name, vars)}`;
    const job = { ws: ctx.workspaceId, account_id: acc.id, ref_id: ref, message: { externalThreadId: `<${ref}@test>`, kind: 'text' as const, text: renderContent(content.text, vars), externalThreadTo: me.email, meta: { subject, messageId: `<${ref}@test>` } } };
    await logEvent(tx, c.id, 'test_sent', { userId: actorUserId(ctx), name: me.name }, now, { to: me.email.replace(/^(.).*(@.*)$/, '$1***$2') });
    const send = this.d.send;
    return { result: { sent_to: me.email }, afterCommit: () => send.enqueue(job) };
  }
}

@Injectable()
@ActionHandler('campaign.resend_unread')
export class CampaignResendUnreadHandler implements Handler<ActionInput<typeof campaignResendUnread>, { campaign_id: string; code: string; est_recipients: number; read_evidence: boolean }> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  private async targets(tx: TenantTx, campaignId: string) {
    return tx.campaignRecipient.findMany({ where: { campaignId, outcome: 'accepted', readAt: null, repliedAt: null, convertedAt: null }, select: { contactId: true } });
  }

  async preview(_ctx: ActionContext, input: ActionInput<typeof campaignResendUnread>, tx: TenantTx): Promise<ActionPreview> {
    const c = await findCampaign(tx, input.campaign_id);
    const n = (await this.targets(tx, c.id)).length;
    return preview('write', line(c.code, c.name, n), { count: n, changes: [created('campaign', { name: c.name, status: 'draft', recipients: n })], ...(CHANNEL_CAPS[c.channel as CampaignChannel].read_receipt ? {} : { warnings: ['no_read_receipt'] }) });
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof campaignResendUnread>, tx: TenantTx): Promise<HandlerOutcome<{ campaign_id: string; code: string; est_recipients: number; read_evidence: boolean }>> {
    const src = await findCampaign(tx, input.campaign_id);
    if (!['running', 'paused', 'completed', 'cancelled'].includes(src.status)) throw new AppError('INVALID_TRANSITION', 409, { status: src.status });
    const now = this.clock.now();
    const ids = (await this.targets(tx, src.id)).map((r) => r.contactId);
    if (!ids.length) throw new AppError('VALIDATION_FAILED', 422, { audience: 'empty' });
    const id = uuidv7(now.getTime());
    const code = await nextCode(tx, 'campaign');
    const actor = await actorOf(ctx, this.members);
    const row = await tx.campaign.create({
      data: { id, code, name: `${src.name} · gửi lại`.slice(0, 160), kind: src.kind, channel: src.channel, accountId: src.accountId, content: src.content as object, sendMode: 'now', createdByUserId: actor.userId, createdAt: now, updatedAt: now, estRecipients: ids.length },
    });
    for (let i = 0; i < ids.length; i += 1000) await tx.campaignAudience.createMany({ data: ids.slice(i, i + 1000).map((contactId) => ({ campaignId: id, contactId, source: 'manual', createdAt: now })), skipDuplicates: true });
    await logEvent(tx, id, 'created', actor, now, { resend_of: src.code });
    return { result: { campaign_id: id, code, est_recipients: ids.length, read_evidence: CHANNEL_CAPS[src.channel as CampaignChannel].read_receipt }, after: { id }, events: [changed('campaign.updated', row, actor.userId)] };
  }

  /** Hoàn tác: xoá mềm nháp gửi lại khi vẫn là nháp (chưa gửi duyệt — chưa có tác dụng ngoài). */
  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx) {
    const c = await lockCampaign(tx, (log.after as { id: string }).id);
    if (c.status !== 'draft') throw new AppError('CONFLICT', 409, { campaign_id: 'changed' });
    const now = this.clock.now();
    await tx.campaign.update({ where: { id: c.id }, data: { deletedAt: now, version: { increment: 1 }, updatedAt: now } });
    await logEvent(tx, c.id, 'undo', await actorOf(ctx, this.members), now, { action: 'campaign.resend_unread' });
  }
}

type ImportOut = { batch_id: string | null; rows: number; valid: number; invalid: number; duplicate: number; opted_out: number; created: number; errors: { row: number; reason: string }[] };

@Injectable()
@ActionHandler('campaign.audience_import')
export class CampaignAudienceImportHandler implements Handler<ActionInput<typeof campaignAudienceImport>, ImportOut> {
  constructor(
    @Inject(MarketingDeps) private readonly d: MarketingDeps,
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** Đọc + parse tệp ngoài transaction (exceljs chậm); kiểm quyền tệp như nhập sản phẩm (người tải lên / Owner, đúng loại, còn hạn). */
  async prepare(ctx: ActionContext, input: ActionInput<typeof campaignAudienceImport>) {
    const db = await this.d.tenants().get(TenantContexts.system(ctx.workspaceId, 'campaign.audience_import'));
    const g = await checkFile(db, actorUserId(ctx) ?? '', input.file_id, IMPORT_FILE_RULE, this.clock.now());
    if ('denied' in g) throw new AppError('VALIDATION_FAILED', 422, { file_id: g.denied });
    const f = await this.d.files().read(db, g.id);
    if (!f) throw new AppError('VALIDATION_FAILED', 422, { file_id: 'not_found' });
    return parseRows({ name: f.row.name, mime: f.row.mime, body: f.body });
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof campaignAudienceImport>, tx: TenantTx): Promise<ActionPreview> {
    const rows = await this.prepare(ctx, input);
    const k = countKinds(await classifyRows(tx, ctx.authz, rows, can(ctx.authz, 'crm.import')));
    return preview('write', line(k.rows, k.valid, k.invalid), { count: k.valid, changes: [created('campaign_audience_batch', { rows: k.rows, valid: k.valid, create: k.create })] });
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof campaignAudienceImport>, tx: TenantTx, _ptx?: unknown, prepared?: unknown): Promise<HandlerOutcome<ImportOut>> {
    const now = this.clock.now();
    const rows = (prepared as Awaited<ReturnType<CampaignAudienceImportHandler['prepare']>>) ?? (await this.prepare(ctx, input));
    const cls = await classifyRows(tx, ctx.authz, rows, can(ctx.authz, 'crm.import'));
    const k = countKinds(cls);
    const errors = rowErrors(cls);
    if (input.dry_run) return { result: { batch_id: null, rows: k.rows, valid: k.valid, invalid: k.invalid + k.owned, duplicate: k.duplicate, opted_out: k.opted_out, created: 0, errors } };
    const me = actorUserId(ctx);
    const roleKey = await this.members.roleOf(ctx.workspaceId, me);
    const ids: string[] = [];
    const made: string[] = [];
    for (const r of cls) {
      if (r.kind === 'match') ids.push(r.contactId!);
      if (r.kind !== 'create') continue;
      const c = await createContact(tx, { full_name: r.name, ...(r.phone ? { phone: r.phone } : {}), ...(r.email ? { email: r.email } : {}) }, { workspaceId: ctx.workspaceId, authz: ctx.authz, roleKey, actorUserId: me, now, members: this.members, skipRequiredCustom: true });
      ids.push(c.id);
      made.push(c.id);
    }
    const id = uuidv7(now.getTime());
    const campaignId = input.campaign_id ? (await findCampaign(tx, input.campaign_id)).id : null;
    await tx.campaignAudienceBatch.create({
      data: { id, campaignId, fileId: input.file_id, rows: k.rows, valid: ids.length, invalid: k.invalid + k.owned, duplicate: k.duplicate, optedOut: k.opted_out, created: made.length, errors, contactIds: [...new Set(ids)], createdByUserId: me, createdAt: now },
    });
    return {
      result: { batch_id: id, rows: k.rows, valid: ids.length, invalid: k.invalid + k.owned, duplicate: k.duplicate, opted_out: k.opted_out, created: made.length, errors },
      events: made.map((cid) => ({ topic: 'contact.created', payload: { contact_id: cid, owner_user_id: me, source: 'manual' } })),
    };
  }
}

@Injectable()
@ActionHandler('campaign.recipient_export')
export class CampaignRecipientExportHandler implements Handler<ActionInput<typeof campaignRecipientExport>, { file_id: string; rows: number; url: string }> {
  constructor(@Inject(MarketingDeps) private readonly d: MarketingDeps) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof campaignRecipientExport>, tx: TenantTx): Promise<HandlerOutcome<{ file_id: string; rows: number; url: string }>> {
    const c = await findCampaign(tx, input.campaign_id);
    const { csv, rows } = await exportRows(tx, ctx.authz, c.id, input.status);
    const f = await this.d.files().upload(tx, ctx.workspaceId, { name: `${c.code}-nguoi-nhan.csv`, mime: 'text/csv', body: Buffer.from(csv, 'utf8'), purpose: 'attachment', uploadedBy: actorUserId(ctx) });
    return { result: { file_id: f.id, rows, url: `/v1/files/${f.id}` } };
  }
}
