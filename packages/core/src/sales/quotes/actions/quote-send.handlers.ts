// quote.send · extend_validity (COMMERCE §3; templates.md §7). Gửi: chạm ngưỡng mà chưa duyệt → QUOTE_NEEDS_APPROVAL (409, kèm lý do);
// PDF render NGOÀI transaction (`prepare` — LibreOffice chậm), lưu tệp đóng băng; trong transaction khoá dòng, kiểm lại trạng thái,
// đặt `valid_until` = cuối ngày (gửi + valid_days) theo giờ workspace, gửi tin + PDF vào hội thoại của khách, bản trước cùng chuỗi
// (`revision_requested`) → `superseded`; event `quote.sent`, timeline, giai đoạn khách → Báo giá. Gia hạn: dời hạn từ hạn hiện tại
// (hoặc từ hôm nay nếu đã hết hạn — `expired` → `sent`), gửi lại link; đã có phiên bản mới hơn → INVALID_TRANSITION.
import { Inject, Injectable } from '@nestjs/common';
import { TenantContexts } from '@appchat/db';
import { AppError, QUOTE_FLOW, assertTransition, createFmt, interpolate, serverMessages } from '@appchat/shared';
import type { ActionInput, quoteExtendValidity, quoteSend } from '@appchat/actions';
import { CLOCK, type Clock } from '../../../kernel/clock';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../../kernel/actions/handler';
import { ChannelSendQueue } from '../../../channels/public';
import { CrmMembers, actorUserId, applyStageRule, writeTimeline } from '../../../crm/public';
import { enqueueOutgoing } from '../../../inbox/public';
import { lockQuote, visibleQuote } from '../quote-access';
import { freezeQuotePdf, renderQuotePdf } from '../services/quote-doc';
import { QuoteDeps } from '../services/quote-deps';
import { pdfLinkOf, quoteLinkOf } from '../services/quote-env';
import { customerConversation, postToCustomer, reachCustomer } from '../services/quote-send';
import { quoteDelivery } from '../services/quote-image';
import { extendPreview, sendPreview } from '../previews/quote-send.handlers.preview';
import { hasNewerVersion, moveStatus, reasonsOf, validUntilOf } from '../services/quote-write';

type SendIn = ActionInput<typeof quoteSend>;
interface Prepared {
  fileId: string;
  sha256: string;
  name: string;
  text: string;
  validUntil: string;
  total: string;
  /** Ảnh trang (format image) theo thứ tự trang; rỗng = gửi PDF. */
  pages: { fileId: string; name: string }[];
  /** Link công khai xem / tải PDF (webchat). */
  link: string | null;
}

const actorOf = (ctx: ActionContext) => ({ type: ctx.actor.type, id: actorUserId(ctx) });

@Injectable()
@ActionHandler('quote.send')
export class QuoteSendHandler implements Handler<SendIn, { quote_id: string; valid_until: string }> {
  constructor(
    @Inject(QuoteDeps) private readonly d: QuoteDeps,
    @Inject(ChannelSendQueue) private readonly queue: ChannelSendQueue | null,
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** Kiểm ngưỡng + trạng thái rồi render / lưu PDF (ngoài transaction). Kiểm lại trong `execute` sau khi khoá dòng. */
  async prepare(ctx: ActionContext, input: SendIn): Promise<Prepared> {
    const env = this.d.need('env');
    const db = await this.d.need('tenants').get(TenantContexts.system(ctx.workspaceId, 'quote.send'));
    const q = await db.$transaction((tx) => visibleQuote(tx, ctx.authz, input.quote_id));
    assertTransition(QUOTE_FLOW, q.status, 'quote.send');
    if (q.status === 'draft') {
      const reasons = await db.$transaction((tx) => reasonsOf(tx, q, ctx));
      if (reasons.length) throw new AppError('QUOTE_NEEDS_APPROVAL', 409, Object.fromEntries(reasons.map((r) => [r, 'over_threshold'])));
    }
    // Kênh nhận kiểm trước khi render (LibreOffice vài giây) — khách chưa nhắn Zalo / chưa có email thì báo ngay, không đóng băng PDF thừa.
    await db.$transaction(async (tx) => reachCustomer(tx, await tx.contact.findUniqueOrThrow({ where: { id: q.contactId }, select: { id: true, email: true } }), input.channel));
    const now = this.clock.now();
    const { timeZone } = await this.d.place(ctx.workspaceId);
    const validUntil = validUntilOf(now, q.validDays, timeZone);
    const r = await renderQuotePdf(db, this.d.doc(), ctx.workspaceId, { ...q, sentAt: now }, validUntil);
    const f = await freezeQuotePdf(db, this.d.doc(), ctx.workspaceId, q, r.pdf, actorUserId(ctx), r.doc.locale);
    const m = serverMessages(r.doc.locale).sales.quote;
    const text = interpolate(m.message, {
      customer: r.doc.data.customer.name ?? '',
      business: r.doc.business.legal_name ?? '',
      code: q.code,
      version: q.version,
      total: r.doc.data.totals.total ?? '',
      valid_until: r.doc.data.doc.valid_until ?? '',
      link: quoteLinkOf(env, ctx.workspaceId, q.id),
    });
    const extra = await quoteDelivery(ctx, db, this.d, q, { ...f, pdf: r.pdf }, input, now, validUntil);
    return { ...f, text, validUntil: validUntil.toISOString(), total: r.doc.data.totals.total ?? '', ...extra };
  }

  async execute(ctx: ActionContext, input: SendIn, tx: TenantTx, _ptx?: unknown, prepared?: unknown): Promise<HandlerOutcome<{ quote_id: string; valid_until: string }>> {
    const p = prepared as Prepared;
    const q = await lockQuote(tx, ctx.authz, input.quote_id);
    const to = assertTransition(QUOTE_FLOW, q.status, 'quote.send');
    if (q.status === 'draft' && (await reasonsOf(tx, q, ctx)).length) throw new AppError('QUOTE_NEEDS_APPROVAL', 409, { quote_id: 'over_threshold' });
    const now = this.clock.now();
    const contact = await tx.contact.findUniqueOrThrow({ where: { id: q.contactId }, select: { id: true, name: true, email: true, ownerUserId: true } });
    const target = await customerConversation(tx, contact, input.channel, `${q.code} · ${contact.name}`, now);
    await tx.file.updateMany({ where: { id: { in: [p.fileId, ...p.pages.map((x) => x.fileId)] } }, data: { confirmed: true } });
    const env = this.d.need('env');
    const attachments = p.pages.length
      ? p.pages.map((x) => ({ url: pdfLinkOf(env, ctx.workspaceId, x.fileId), mime: 'image/png', name: x.name }))
      : [{ url: pdfLinkOf(env, ctx.workspaceId, p.fileId), mime: 'application/pdf', name: p.name }];
    const text = p.link ? `${p.text}
${p.link}` : p.text;
    const sent = await postToCustomer(ctx, tx, this.members, { ...target, text, attachments, now });
    await moveStatus(tx, q, to, { sentAt: now, sentChannel: input.channel, validUntil: new Date(p.validUntil), remindedAt: null, conversationId: target.conv.id, fileId: p.fileId, fileSha256: p.sha256 }, now);
    // Bản trước của chuỗi (khách đã xin sửa) → bản cũ.
    await tx.quote.updateMany({ where: { rootQuoteId: q.rootQuoteId, version: { lt: q.version }, status: 'revision_requested', deletedAt: null }, data: { status: 'superseded', updatedAt: now } });
    await writeTimeline(tx, { contactId: q.contactId, type: 'quote', key: 'quote_sent', params: { code: q.code, version: q.version, total: p.total }, actor: actorOf(ctx), ref: { type: 'quote', id: q.id }, at: now });
    const stage = await applyStageRule(tx, { contactId: q.contactId, mode: 'raise', to: 'quote', actor: actorOf(ctx), now });
    return {
      result: { quote_id: q.id, valid_until: p.validUntil },
      events: [{ topic: 'quote.sent', payload: { quote_id: q.id, contact_id: q.contactId, code: q.code, version: q.version, channel: input.channel, format: input.format ?? 'pdf', pages: p.pages.length, valid_until: p.validUntil } }, ...sent.events, ...stage],
      afterCommit: () => enqueueOutgoing(this.queue, ctx.workspaceId, sent.out),
    };
  }

  async preview(ctx: ActionContext, input: SendIn, tx: TenantTx) {
    return sendPreview(ctx, tx, input, this.clock.now(), (await this.d.place(ctx.workspaceId)).timeZone);
  }
}

type ExtendIn = ActionInput<typeof quoteExtendValidity>;

@Injectable()
@ActionHandler('quote.extend_validity')
export class QuoteExtendHandler implements Handler<ExtendIn, { quote_id: string; valid_until: string }> {
  constructor(
    @Inject(QuoteDeps) private readonly d: QuoteDeps,
    @Inject(ChannelSendQueue) private readonly queue: ChannelSendQueue | null,
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ExtendIn, tx: TenantTx): Promise<HandlerOutcome<{ quote_id: string; valid_until: string }>> {
    const q = await lockQuote(tx, ctx.authz, input.quote_id);
    const to = assertTransition(QUOTE_FLOW, q.status, 'quote.extend_validity');
    if (await hasNewerVersion(tx, q)) throw new AppError('INVALID_TRANSITION', 409, { status: q.status, version: 'newer_exists' });
    const now = this.clock.now();
    const { timeZone, locale } = await this.d.place(ctx.workspaceId);
    const base = q.status === 'expired' || !q.validUntil || q.validUntil < now ? now : q.validUntil;
    const validUntil = validUntilOf(base, input.days, timeZone);
    await moveStatus(tx, q, to, { validUntil, remindedAt: null }, now);
    const out = { quote_id: q.id, valid_until: validUntil.toISOString() };
    const before = { id: q.id, status: q.status, valid_until: q.validUntil?.toISOString() ?? null, reminded_at: q.remindedAt?.toISOString() ?? null };
    // Báo giá đã hết hạn được mở lại → gửi lại link cho khách vào hội thoại đã gửi (D52).
    if (q.status !== 'expired' || !q.conversationId) return { result: out, before };
    const conv = await tx.conversation.findUnique({ where: { id: q.conversationId } });
    if (!conv) return { result: out, before };
    const text = interpolate(serverMessages(locale).sales.quote.extended, { code: q.code, valid_until: createFmt({ locale, timeZone }).date(validUntil), link: quoteLinkOf(this.d.need('env'), ctx.workspaceId, q.id) });
    const sent = await postToCustomer(ctx, tx, this.members, { conv, created: false, text, now });
    return { result: out, before, events: sent.events, afterCommit: () => enqueueOutgoing(this.queue, ctx.workspaceId, sent.out) };
  }

  async preview(ctx: ActionContext, input: ExtendIn, tx: TenantTx) {
    return extendPreview(ctx, tx, input, this.clock.now(), (await this.d.place(ctx.workspaceId)).timeZone);
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const b = log.before as { id: string; status: 'sent' | 'viewed' | 'expired'; valid_until: string | null; reminded_at: string | null };
    await tx.quote.update({ where: { id: b.id }, data: { status: b.status, validUntil: b.valid_until ? new Date(b.valid_until) : null, remindedAt: b.reminded_at ? new Date(b.reminded_at) : null } });
  }
}
