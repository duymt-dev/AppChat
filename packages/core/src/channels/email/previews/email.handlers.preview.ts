// Preview kết nối hộp thư (TIP-023b R2.8, risk config): tài khoản email mới (tên · địa chỉ · máy chủ IMAP / SMTP — không credential); form sai
// → 422, địa chỉ đang có tài khoản → 409 như execute. Không đăng nhập thật ở preview (execute kiểm IMAP + SMTP trước khi lưu) — cảnh báo.
import { AppError } from '@appchat/shared';
import type { ActionInput, ActionPreview, channelEmailConnect } from '@appchat/actions';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { created, preview } from '../../../kernel/actions/preview-kit';
import { emailCredentials } from '../credentials';

export async function emailConnectPreview(tx: TenantTx, i: ActionInput<typeof channelEmailConnect>): Promise<ActionPreview> {
  const c = emailCredentials(i.address, i.fields);
  if (await tx.channelAccount.findFirst({ where: { type: 'email', externalId: c.address, status: { not: 'disconnected' } }, select: { id: true } })) {
    throw new AppError('CONFLICT', 409, { address: 'exists' });
  }
  const name = i.name?.trim() || c.address;
  return preview('config', name, { changes: [created('channel_account', { type: 'email', name, address: c.address, imap_host: c.imap_host, smtp_host: c.smtp_host })], warnings: ['verify_login'] });
}
