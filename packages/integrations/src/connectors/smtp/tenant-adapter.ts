// TenantMailProvider SMTP (TIP-012c §1, hợp đồng test/fixtures/smtp/tenant-mail-contract.json). Transport đã ghim IP + TLS bắt buộc do
// core tiêm (MailTransports.smtp → tenant-transport.ts). SMTP chỉ chứng minh đăng nhập + TLS (`authenticated_transport`), KHÔNG chứng minh
// sở hữu domain: người gửi là `declared` do người tích hợp xác nhận. Không có sự kiện giao / mở / nhấp (hiển thị "không hỗ trợ", không 0).
//   accepted     — info.accepted chứa người nhận VÀ phản hồi 250 sau DATA; tham chiếu = Message-ID đã gửi.
//   failed       — 5xx ở MAIL / RCPT, người nhận bị từ chối (vĩnh viễn); 4xx / kết nối / TLS / auth trước DATA (thử lại được).
//   unknown      — đứt / hết giờ ở DATA (có thể đã nhận) hoặc phản hồi không chứng minh nhận.
import { ProviderError } from '../../provider-errors';
import type { ConnectionCtx, ConnectorManifest } from '../../types';
import type { MailTransports, SendOutcome, TenantMailMessage, TenantMailProbe, TenantMailProvider } from '../../ports/tenant-mail';
import { messageError } from '../../tenant-mail-validation';

type SmtpErr = { responseCode?: number; command?: string; code?: string };
const BEFORE_DATA = new Set(['CONN', 'EHLO', 'HELO', 'STARTTLS', 'AUTH', 'AUTH PLAIN', 'AUTH LOGIN', 'MAIL FROM', 'RCPT TO', 'API']);

export function classifySmtpError(e: unknown): SendOutcome {
  const x = (e ?? {}) as SmtpErr;
  const cmd = (x.command ?? '').toUpperCase();
  const code = typeof x.responseCode === 'number' ? x.responseCode : 0;
  if (cmd === 'DATA' || cmd === 'MESSAGE' || cmd === '') return code >= 500 && cmd === 'DATA' ? { state: 'failed_before_accept', retryable: false, reason: `smtp_${code}` } : { state: 'unknown', reason: x.code ?? `smtp_${code || 'lost'}` };
  if (BEFORE_DATA.has(cmd) || cmd.startsWith('AUTH')) {
    if (cmd.startsWith('AUTH') || x.code === 'EAUTH') return { state: 'failed_before_accept', retryable: false, reason: 'auth_failed' };
    if (code >= 500) return { state: 'failed_before_accept', retryable: false, reason: `smtp_${code}` };
    return { state: 'failed_before_accept', retryable: true, reason: code ? `smtp_${code}` : (x.code ?? 'connect') };
  }
  return { state: 'unknown', reason: x.code ?? 'smtp' };
}

export class SmtpTenantMail implements TenantMailProvider {
  readonly tenantMail = true as const;
  constructor(readonly manifest: ConnectorManifest) {}

  private async transport(conn: ConnectionCtx, t: MailTransports) {
    if (!t.smtp) throw new ProviderError('unsupported', 'smtp');
    return t.smtp(conn);
  }

  /** Thăm dò = mở kết nối + TLS + đăng nhập (core verify) — KHÔNG gửi thư. Người gửi: cấu hình hiện tại, trạng thái theo xác nhận. */
  async probe(conn: ConnectionCtx, t: MailTransports): Promise<TenantMailProbe> {
    await this.transport(conn, t);
    const email = (conn.config.sender_email ?? '').toLowerCase();
    return { state: 'authenticated_transport', accountRef: null, senders: [{ id: 'configured', email, name: conn.config.sender_name ?? '', state: conn.config.sender_confirmed === 'true' ? 'configured' : 'unverified' }], events: false };
  }

  async send(conn: ConnectionCtx, t: MailTransports, msg: TenantMailMessage): Promise<SendOutcome> {
    const bad = messageError(msg);
    if (bad) return { state: 'failed_before_accept', retryable: false, reason: `invalid_${bad}` };
    let send;
    try {
      send = await this.transport(conn, t);
    } catch (e) {
      return { state: 'failed_before_accept', retryable: !(e instanceof ProviderError && e.code === 'unsupported'), reason: e instanceof ProviderError ? e.code : 'connect' };
    }
    try {
      const info = await send({
        from: { address: conn.config.sender_email ?? '', name: conn.config.sender_name ?? '' },
        ...(conn.config.reply_to ? { replyTo: conn.config.reply_to } : {}),
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        messageId: msg.messageId,
        headers: { 'X-AppChat-Tag': msg.tag, ...(msg.listUnsubscribe ? { 'List-Unsubscribe': `<${msg.listUnsubscribe}>` } : {}) },
      });
      const to = msg.to.toLowerCase();
      if (info.rejected.some((r) => r.toLowerCase() === to)) return { state: 'failed_before_accept', retryable: false, reason: 'rcpt_rejected' };
      if (info.accepted.some((a) => a.toLowerCase() === to) && /^250[ -]/.test(info.response)) return { state: 'accepted', providerMessageRef: msg.messageId, evidence: info.response.slice(0, 120) };
      return { state: 'unknown', reason: 'no_acceptance_evidence' };
    } catch (e) {
      return classifySmtpError(e);
    }
  }
}
