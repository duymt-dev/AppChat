// Preview gửi ký / nhắc / gia hạn link / chấm dứt (TIP-023b R2.8): gửi ký → khách + kênh + nơi nhận (hội thoại sẵn có / địa chỉ email mở
// chuỗi mới) + hạn link dự tính (SIGN_LINK_DAYS); nhắc → hội thoại đã gửi + hạn link còn hiệu lực (hết hạn / chưa gửi → 409 như execute);
// gia hạn → hạn link trước / sau; chấm dứt (risk money) → trạng thái + lý do, đơn đã tạo giữ nguyên. Chỉ đọc — không phát link, không gửi tin.
import type { ActionInput, ActionPreview, contractExtendSignLink, contractRemindSigner, contractSendForSignature, contractTerminate } from '@appchat/actions';
import { AppError, SIGN_LINK_DAYS, dayEndAfter } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { line, preview, updated } from '../../../kernel/actions/preview-kit';
import { reachCustomer } from '../../../sales/public';
import { flowOf, label, money } from './contract-write.handlers.preview';

export async function sendPreview(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof contractSendForSignature>, now: Date, timeZone: string): Promise<ActionPreview> {
  const { c, contact } = await flowOf(tx, ctx, i.contract_id, 'contract.send_for_signature');
  const reach = await reachCustomer(tx, await tx.contact.findUniqueOrThrow({ where: { id: c.contactId }, select: { id: true, email: true } }), i.channel);
  const expires = dayEndAfter(now, SIGN_LINK_DAYS, timeZone).toISOString();
  return preview('send', line(label(c), contact, money(c.value)), {
    changes: updated('contract', c.id, { sign_link_expires_at: c.signLinkExpiresAt?.toISOString() ?? null }, { channel: i.channel, to: reach.conv ? (reach.conv.title ?? contact) : reach.to, sign_link_expires_at: expires }),
    ...(reach.conv ? {} : { warnings: ['new_email_thread'] }),
  });
}

/** Hội thoại đã gửi ký (nhắc / gia hạn gửi vào đây). */
async function sentTo(tx: TenantTx, conversationId: string | null) {
  const conv = conversationId ? await tx.conversation.findUnique({ where: { id: conversationId }, select: { title: true, channelType: true } }) : null;
  if (!conv) throw new AppError('INVALID_STATE', 409, { sent: 'not_sent' });
  return conv;
}

export async function remindPreview(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof contractRemindSigner>, now: Date): Promise<ActionPreview> {
  const { c, contact } = await flowOf(tx, ctx, i.contract_id, 'contract.remind_signer');
  const live = await tx.contractSignToken.findFirst({ where: { contractId: c.id, usedAt: null, expiresAt: { gt: now } }, orderBy: { createdAt: 'desc' }, select: { expiresAt: true } });
  if (!live) throw new AppError('INVALID_STATE', 409, { sign_link: 'expired' });
  const conv = await sentTo(tx, c.conversationId);
  return preview('send', line(label(c), contact), { changes: [{ entity: 'message', after: { to: conv.title ?? contact, channel: conv.channelType, sign_link_expires_at: live.expiresAt.toISOString() } }] });
}

export async function extendPreview(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof contractExtendSignLink>, now: Date, timeZone: string): Promise<ActionPreview> {
  const { c, contact } = await flowOf(tx, ctx, i.contract_id, 'contract.extend_sign_link');
  const t = await tx.contractSignToken.findFirst({ where: { contractId: c.id, usedAt: null }, orderBy: { createdAt: 'desc' }, select: { expiresAt: true } });
  if (!t) throw new AppError('INVALID_STATE', 409, { sign_link: 'not_sent' });
  const expires = dayEndAfter(t.expiresAt > now ? t.expiresAt : now, i.days ?? SIGN_LINK_DAYS, timeZone);
  // Link cũ còn hiệu lực + đã gửi qua hội thoại → báo khách hạn mới (như execute).
  const notify = t.expiresAt > now && !!c.conversationId;
  return preview('send', line(label(c), contact), {
    changes: updated('contract', c.id, { sign_link_expires_at: t.expiresAt.toISOString() }, { sign_link_expires_at: expires.toISOString() }),
    ...(notify ? { warnings: ['notify_customer'] } : {}),
  });
}

export async function terminatePreview(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof contractTerminate>): Promise<ActionPreview> {
  const { c, to, contact } = await flowOf(tx, ctx, i.contract_id, 'contract.terminate');
  return preview('money', line(label(c), contact, money(c.value)), { changes: updated('contract', c.id, { status: c.status }, { status: to, reason: i.reason.trim() }) });
}
