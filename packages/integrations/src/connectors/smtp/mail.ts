// SMTP (nodemailer) — MailProvider dự phòng (Blueprint §8, DC-018). Mật khẩu chỉ từ env, không log; lỗi trả MailSendError
// không kèm thông tin đăng nhập.
import nodemailer, { type Transporter } from 'nodemailer';
import { MailSendError, type MailMessage, type MailProvider } from '../../ports/mail';

export interface SmtpOptions {
  host: string;
  port: number;
  /** true = TLS ngay (465); false = STARTTLS nếu server hỗ trợ (587 / 25). */
  secure: boolean;
  user?: string;
  pass?: string;
  sender: { email: string; name: string };
  /** Test: transport tuỳ biến (vd. `{ jsonTransport: true }`) thay SMTP thật. */
  transport?: Parameters<typeof nodemailer.createTransport>[0];
}

export class SmtpMailProvider implements MailProvider {
  readonly key = 'smtp';
  private readonly t: Transporter;

  constructor(private readonly o: SmtpOptions) {
    this.t = nodemailer.createTransport(
      o.transport ?? {
        host: o.host,
        port: o.port,
        secure: o.secure,
        ...(o.user ? { auth: { user: o.user, pass: o.pass ?? '' } } : {}),
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
      },
    );
  }

  async send(msg: MailMessage): Promise<{ id: string }> {
    try {
      const info = await this.t.sendMail({
        from: { address: this.o.sender.email, name: this.o.sender.name },
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        headers: { 'X-AppChat-Tag': msg.tag },
      });
      return { id: String(info.messageId ?? '') };
    } catch (err) {
      const code = (err as { responseCode?: number }).responseCode;
      throw new MailSendError(this.key, typeof code === 'number' ? code : 0);
    }
  }
}
