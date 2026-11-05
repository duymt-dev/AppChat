// Preview gửi email tới khách (TIP-023b R2.8, risk send): khách · địa chỉ nhận · tiêu đề · hộp thư gửi → hội thoại email mới + tin ra; địa chỉ
// sai → 422, chưa có tài khoản email `from` → 409, khách ngoài scope → 404 như execute. Chỉ đọc (không mở thread, không xếp gửi).
import { AppError } from '@appchat/shared';
import type { ActionInput, ActionPreview, contactSendEmail } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { created, line, preview } from '../../../kernel/actions/preview-kit';
import { editableContact } from '../../../crm/public';
import { previewOf } from '../../services/view';

const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

export async function sendEmailPreview(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof contactSendEmail>): Promise<ActionPreview> {
  const { contact } = await editableContact(tx, ctx.authz, i.contact_id);
  const to = i.to.trim().toLowerCase();
  if (!EMAIL.test(to)) throw new AppError('VALIDATION_FAILED', 422, { to: 'invalid' });
  const from = i.from.toLowerCase();
  const account = await tx.channelAccount.findFirst({ where: { type: 'email', externalId: from, status: { not: 'disconnected' } }, select: { id: true, name: true } });
  if (!account) throw new AppError('INVALID_STATE', 409, { connector: 'email' });
  return preview('send', line(contact.name, to), {
    changes: [created('message', { channel: 'email', from, to, subject: i.subject, body: previewOf('text', i.body) })],
    warnings: ['new_email_thread'],
  });
}
