// quote.send · extend_validity (COMMERCE §3; templates.md §7). Gửi: chạm ngưỡng mà chưa duyệt → QUOTE_NEEDS_APPROVAL (409, kèm lý do);
// trong transaction khoá dòng, kiểm lại trạng thái + kênh nhận, đặt `valid_until` = cuối ngày (gửi + valid_days) theo giờ workspace,
// → `sent`, bản trước cùng chuỗi (`revision_requested`) → `superseded`; event `quote.sent`, timeline, giai đoạn khách → Báo giá. TIP-028b:
// PDF đóng băng KHÔNG render trong action — ghi `document_render` `pending_render` (chụp kênh / định dạng / người gửi) + outbox; job
// `doc-render` (ROLE=jobs) render, gắn tệp + gửi tin kèm PDF vào hội thoại của khách (quote-render.ts). API trả ngay. Gia hạn: dời hạn
// từ hạn hiện tại (hoặc từ hôm nay nếu đã hết hạn — `expired` → `sent`), gửi lại link; đã có phiên bản mới hơn → INVALID_TRANSITION.
import { Inject, Injectable } from '@nestjs/common';
import { AppError, QUOTE_FLOW, assertTransition, createFmt, interpolate, serverMessages } from '@appchat/shared';
import type { ActionInput, quoteExtendValidity, quoteSend } from '@appchat/actions';
import { CLOCK, type Clock } from '../../../kernel/clock';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../../kernel/actions/handler';
import { ChannelSendQueue } from '../../../channels/public';
import { CrmMembers, actorUserId, applyStageRule, lockStageFamilyOf, writeTimeline } from '../../../crm/public';
import { enqueueOutgoing, senderOf } from '../../../inbox/public';
import { requestRender } from '../../../documents/public';
import { lockQuote } from '../quote-access';
import { QuoteDeps } from '../services/quote-deps';
import { quoteLinkOf } from '../services/quote-env';
import { postToCustomer, reachCustomer } from '../services/quote-send';
import { assertDeliverable } from '../services/quote-image';
import { QUOTE_RENDER_KIND, type QuoteRenderRequest } from '../services/quote-render';
import { extendPreview, sendPreview } from '../previews/quote-send.handlers.preview';
import { hasNewerVersion, moveStatus, reasonsOf, validUntilOf } from '../services/quote-write';

type SendIn = ActionInput<typeof quoteSend>;
type SendOut = { quote_id: string; valid_until: string };

const actorOf = (ctx: ActionContext) => ({ type: ctx.actor.type, id: actorUserId(ctx) });

@Injectable()
@ActionHandler('quote.send')
export class QuoteSendHandler implements Handler<SendIn, SendOut> {
  constructor(
    @Inject(QuoteDeps) private readonly d: QuoteDeps,
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: SendIn, tx: TenantTx): Promise<HandlerOutcome<SendOut>> {
    this.d.need('env');
    assertDeliverable(this.d, input);
    if (!this.d.renderer) throw new AppError('NOT_IMPLEMENTED', 501, { tip: '028' }, 'DocRenderer chưa cấu hình');
    await lockStageFamilyOf(tx, 'quote', input.quote_id);
    const q = await lockQuote(tx, ctx.authz, input.quote_id);
    const to = assertTransition(QUOTE_FLOW, q.status, 'quote.send');
    if (q.status === 'draft') {
      const reasons = await reasonsOf(tx, q, ctx);
      if (reasons.length) throw new AppError('QUOTE_NEEDS_APPROVAL', 409, Object.fromEntries(reasons.map((r) => [r, 'over_threshold'])));
    }
    // Kênh nhận kiểm ngay (khách chưa nhắn Zalo / chưa có email → 409) — job chỉ mở hội thoại email khi cần.
    const contact = await tx.contact.findUniqueOrThrow({ where: { id: q.contactId }, select: { id: true, email: true } });
    await reachCustomer(tx, contact, input.channel);
    const now = this.clock.now();
    const { timeZone, locale } = await this.d.place(ctx.workspaceId);
    const validUntil = validUntilOf(now, q.validDays, timeZone);
    const tpl = q.templateId ? null : await tx.docTemplate.findFirst({ where: { kind: 'quote', isDefault: true, deletedAt: null }, select: { id: true, version: true } });
    await moveStatus(tx, q, to, { sentAt: now, sentChannel: input.channel, validUntil, remindedAt: null, fileId: null, fileSha256: null, ...(tpl ? { templateId: tpl.id, templateVersion: tpl.version } : {}) }, now);
    // Bản trước của chuỗi (khách đã xin sửa) → bản cũ.
    await tx.quote.updateMany({ where: { rootQuoteId: q.rootQuoteId, version: { lt: q.version }, status: 'revision_requested', deletedAt: null }, data: { status: 'superseded', updatedAt: now } });
    const request: QuoteRenderRequest = { channel: input.channel, format: input.format ?? 'pdf', sender: await senderOf(ctx, this.members, tx) };
    const render = await requestRender(tx, { kind: QUOTE_RENDER_KIND, documentId: q.id, request: request as unknown as Record<string, unknown>, now });
    const total = createFmt({ locale, timeZone }).money(String(q.total));
    await writeTimeline(tx, { contactId: q.contactId, type: 'quote', key: 'quote_sent', params: { code: q.code, version: q.version, total }, actor: actorOf(ctx), ref: { type: 'quote', id: q.id }, at: now });
    const stage = await applyStageRule(tx, { contactId: q.contactId, mode: 'raise', to: 'quote', actor: actorOf(ctx), now });
    return {
      result: { quote_id: q.id, valid_until: validUntil.toISOString() },
      events: [{ topic: 'quote.sent', payload: { quote_id: q.id, contact_id: q.contactId, code: q.code, version: q.version, channel: input.channel, format: input.format ?? 'pdf', valid_until: validUntil.toISOString() } }, ...render.events, ...stage],
    };
  }

  async preview(ctx: ActionContext, input: SendIn, tx: TenantTx) {
    return sendPreview(ctx, tx, input, this.clock.now(), (await this.d.place(ctx.workspaceId)).timeZone, this.d.doc());
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
