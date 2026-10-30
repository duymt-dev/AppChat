// MailProvider cho dev / test: giữ thư trong bộ nhớ + gọi `sink` (dev in ra log). Kernel cấm dùng khi NODE_ENV=production.
import type { MailMessage, MailProvider } from '../../ports/mail';

export class MemoryMailProvider implements MailProvider {
  readonly key = 'console';
  readonly sent: MailMessage[] = [];
  constructor(private readonly sink?: (msg: MailMessage) => void) {}

  async send(msg: MailMessage): Promise<{ id: string }> {
    this.sent.push(msg);
    this.sink?.(msg);
    return { id: `console-${this.sent.length}` };
  }

  /** Thư gần nhất gửi tới `to` (test lấy mã OTP / link). */
  last(to: string): MailMessage | undefined {
    return [...this.sent].reverse().find((m) => m.to === to);
  }
}
