// TenantMailProvider Brevo (TIP-012c §1): khoá API + người gửi của ĐÚNG kết nối DN. Thăm dò = GET /v3/senders (không gửi thư); người gửi
// cấu hình phải nằm trong danh sách và `active` mới là sender_verified. Gửi qua tenant-client (core tiêm safeFetch). Callback bearer.
// Khác BrevoMailProvider (thư hệ thống nền tảng, env) — không dùng chung khoá / đối tượng.
import { ProviderError } from '../../provider-errors';
import type { ConnectionCtx, ConnectorManifest, WebhookEvent, WebhookRequest } from '../../types';
import type { MailEvent, MailTransports, SendOutcome, TenantMailMessage, TenantMailProbe, TenantMailProvider } from '../../ports/tenant-mail';
import { messageError } from '../../tenant-mail-validation';
import { brevoSend, brevoSenders } from './tenant-client';
import { parseBrevoEvents } from './callback';

export class BrevoTenantMail implements TenantMailProvider {
  readonly tenantMail = true as const;
  constructor(readonly manifest: ConnectorManifest) {}

  private key(conn: ConnectionCtx) {
    const k = conn.secrets.api_key ?? '';
    if (!k) throw new ProviderError('unsupported', 'api_key');
    return k;
  }

  async probe(conn: ConnectionCtx, t: MailTransports): Promise<TenantMailProbe> {
    const senders = await brevoSenders(t, this.key(conn));
    const want = (conn.config.sender_email ?? '').toLowerCase();
    const mine = senders.find((s) => s.email === want);
    const events = !!conn.secrets.webhook_token;
    if (!mine) return { state: 'unverified', accountRef: null, senders, events, reason: 'sender_not_in_account' };
    return { state: mine.state, accountRef: null, senders: [mine], events, ...(mine.state === 'sender_verified' ? {} : { reason: 'sender_inactive' }) };
  }

  async send(conn: ConnectionCtx, t: MailTransports, msg: TenantMailMessage): Promise<SendOutcome> {
    const bad = messageError(msg);
    if (bad) return { state: 'failed_before_accept', retryable: false, reason: `invalid_${bad}` };
    return brevoSend(t, this.key(conn), { email: conn.config.sender_email ?? '', name: conn.config.sender_name ?? '' }, conn.config.reply_to || undefined, msg);
  }

  parseEvents(conn: ConnectionCtx, req: WebhookRequest): MailEvent[] | null {
    return parseBrevoEvents(conn, req);
  }

  /** Cổng webhook chung (provider-ports §6): xác thực ở adapter; payload chuẩn hoá do core mail/ingress xử lý. */
  verifyWebhook(conn: ConnectionCtx, req: WebhookRequest): WebhookEvent | null {
    const evs = parseBrevoEvents(conn, req);
    return evs ? { id: evs[0]?.key ?? 'empty', kind: 'mail_events', payload: evs } : null;
  }
}
