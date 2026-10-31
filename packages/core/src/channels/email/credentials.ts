// Form Email → credential IMAP / SMTP (TIP-018): parse `emailFormSchema` (shared), suy SMTP từ IMAP, kiểm đăng nhập thật qua adapter
// email của registry (Blueprint §6 "kiểm tra credential bằng cách login thật trước khi lưu"). Lỗi → mã để FE dịch, không lộ mật khẩu.
import type { ChannelRegistry, EmailAdapter, MailCredentials } from '@appchat/channels';
import { MailAuthError, MailConnectError } from '@appchat/channels';
import { AppError, emailFormSchema, smtpOf } from '@appchat/shared';

export function emailCredentials(address: string, fields: Record<string, string>): MailCredentials {
  const r = emailFormSchema.safeParse(fields);
  if (!r.success) throw new AppError('VALIDATION_FAILED', 422, Object.fromEntries(r.error.issues.map((i) => [String(i.path[0] ?? 'fields'), 'invalid'])));
  const f = r.data;
  return { address: address.trim().toLowerCase(), imap_host: f.imap_host, imap_port: f.imap_port, ...(f.user ? { user: f.user } : {}), password: f.password, ...smtpOf(f) };
}

export function emailAdapterOf(registry: ChannelRegistry): EmailAdapter {
  const a = registry.get('email')?.adapter as EmailAdapter | undefined;
  if (!a) throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'Kênh Email chưa cấu hình (MAIL_TRANSPORT)');
  return a;
}

/** Kết quả kiểm tra: `ok` hoặc mã lý do (`imap_auth` / `smtp_auth` / `imap_connect` / `smtp_connect`). */
export async function verifyMailbox(adapter: EmailAdapter, c: MailCredentials): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    await adapter.verify(c);
    return { ok: true };
  } catch (err) {
    if (err instanceof MailAuthError) return { ok: false, reason: `${err.side}_auth` };
    if (err instanceof MailConnectError) return { ok: false, reason: `${err.side}_connect` };
    return { ok: false, reason: 'imap_connect' };
  }
}
