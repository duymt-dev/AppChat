// Preview gửi / gia hạn báo giá (TIP-023b R2.8): gửi → khách + kênh + nơi nhận (hội thoại sẵn có / địa chỉ email mở chuỗi mới) + tổng + hạn
// hiệu lực dự tính (cuối ngày gửi + N theo giờ workspace); chạm ngưỡng mà chưa duyệt / không có kênh nhận → cùng lỗi như execute, không
// cho xác nhận thứ sẽ hỏng. Gia hạn → hạn + trạng thái trước / sau; báo giá đã hết hạn nêu việc gửi lại link. Chỉ đọc — không render PDF.
// TIP-028b: gửi kèm bảng kiểm pháp lý (`checklist`) theo mẫu sẽ dùng + dữ liệu thật — cảnh báo, không chặn (DC-444).
import type { ActionInput, ActionPreview, quoteExtendValidity, quoteSend } from '@appchat/actions';
import { AppError, createFmt } from '@appchat/shared';
import { docChecklist } from '../../../documents/public';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { line, preview, updated } from '../../../kernel/actions/preview-kit';
import { reachCustomer } from '../services/quote-send';
import { hasNewerVersion, reasonsOf, validUntilOf } from '../services/quote-write';
import { flowOf, label } from './quote-write.handlers.preview';
import { canSendImages } from '../services/quote-image';
import { quoteDocData, type QuoteDocDeps } from '../services/quote-doc';

const iso = (d: Date | null) => d?.toISOString() ?? null;

export async function sendPreview(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof quoteSend>, now: Date, timeZone: string, doc: QuoteDocDeps): Promise<ActionPreview> {
  const { q, to, contact } = await flowOf(tx, ctx, i.quote_id, 'quote.send');
  if (q.status === 'draft') {
    const reasons = await reasonsOf(tx, q, ctx);
    if (reasons.length) throw new AppError('QUOTE_NEEDS_APPROVAL', 409, Object.fromEntries(reasons.map((r) => [r, 'over_threshold'])));
  }
  if (i.format === 'image' && !canSendImages(i.channel)) throw new AppError('VALIDATION_FAILED', 422, { format: 'channel_no_image' });
  const reach = await reachCustomer(tx, await tx.contact.findUniqueOrThrow({ where: { id: q.contactId }, select: { id: true, email: true } }), i.channel);
  const recipient = reach.conv ? (reach.conv.title ?? contact) : reach.to;
  const total = String(q.total);
  const validUntil = validUntilOf(now, q.validDays, timeZone);
  // Mẫu sẽ render (ghi trên báo giá → mặc định loại quote — như renderQuotePdf); không có mẫu → không có bảng kiểm (gửi báo lỗi riêng).
  const t = (q.templateId ? await tx.docTemplate.findFirst({ where: { id: q.templateId } }) : null) ?? (await tx.docTemplate.findFirst({ where: { kind: 'quote', isDefault: true, deletedAt: null } }));
  const checklist = t ? await docChecklist(t, async () => (await quoteDocData(tx, doc, ctx.workspaceId, { ...q, sentAt: now }, validUntil)).data) : undefined;
  return preview('send', line(label(q), contact, createFmt({ locale: 'vi' }).money(total)), {
    changes: updated('quote', q.id, { status: q.status, valid_until: iso(q.validUntil) }, { status: to, channel: i.channel, format: i.format ?? 'pdf', to: recipient, total, valid_until: validUntil.toISOString() }),
    ...(reach.conv ? {} : { warnings: ['new_email_thread'] }),
    checklist,
  });
}

export async function extendPreview(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof quoteExtendValidity>, now: Date, timeZone: string): Promise<ActionPreview> {
  const { q, to, contact } = await flowOf(tx, ctx, i.quote_id, 'quote.extend_validity');
  if (await hasNewerVersion(tx, q)) throw new AppError('INVALID_TRANSITION', 409, { status: q.status, version: 'newer_exists' });
  const base = q.status === 'expired' || !q.validUntil || q.validUntil < now ? now : q.validUntil;
  const resend = q.status === 'expired' && !!q.conversationId;
  return preview('write', line(label(q), contact), {
    changes: updated('quote', q.id, { status: q.status, valid_until: iso(q.validUntil) }, { status: to, valid_until: validUntilOf(base, i.days, timeZone).toISOString() }),
    ...(resend ? { warnings: ['resend_link'] } : {}),
  });
}
