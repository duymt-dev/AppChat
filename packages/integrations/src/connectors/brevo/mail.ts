// Brevo transactional API (D34) — POST https://api.brevo.com/v3/smtp/email. Key chỉ từ env (ops §2.1), không log.
import { MailSendError, type MailMessage, type MailProvider } from '../../ports/mail';

export interface BrevoOptions {
  apiKey: string;
  sender: { email: string; name: string };
  fetch?: typeof fetch;
  timeoutMs?: number;
}

export class BrevoMailProvider implements MailProvider {
  readonly key = 'brevo';
  constructor(private readonly o: BrevoOptions) {}

  async send(msg: MailMessage): Promise<{ id: string }> {
    const res = await (this.o.fetch ?? fetch)('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': this.o.apiKey, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: this.o.sender, to: [{ email: msg.to }], subject: msg.subject, htmlContent: msg.html, textContent: msg.text, tags: [msg.tag] }),
      signal: AbortSignal.timeout(this.o.timeoutMs ?? 10_000),
    });
    if (!res.ok) throw new MailSendError(this.key, res.status);
    const body = (await res.json().catch(() => ({}))) as { messageId?: string };
    return { id: body.messageId ?? '' };
  }
}
