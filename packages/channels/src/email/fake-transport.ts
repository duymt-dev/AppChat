// MailboxTransport giả (TIP-018): hộp thư trong bộ nhớ theo địa chỉ — test / E2E khi không có máy chủ mail (`MAIL_TRANSPORT=fake`,
// cấm production). Mật khẩu đúng = `FAKE_MAIL_PASSWORD`; `deliver` bơm thư vào INBOX; thư gửi ra ghi ở `sent`. Tuỳ chọn
// `greeting`: hộp thư mới đăng nhập lần đầu nhận sẵn một thư khách (E2E http).
import { randomUUID } from 'node:crypto';
import { MailAuthError, MailConnectError, type FetchResult, type MailCredentials, type MailboxTransport, type OutgoingMail, type ParsedMail } from './transport';

export const FAKE_MAIL_PASSWORD = 'app-password-e2e';
export const FAKE_MAIL_HOST = 'imap.fake.test';

interface Box {
  uidValidity: string;
  uidNext: number;
  mails: ParsedMail[];
}

export class FakeMailboxTransport implements MailboxTransport {
  private readonly boxes = new Map<string, Box>();
  readonly sent: (OutgoingMail & { messageId: string; account: string })[] = [];
  /** Thư chào của khách giả khi hộp thư được đăng nhập lần đầu (E2E http). */
  greeting?: { from: string; name: string; subject: string; text: string };

  private box(address: string): Box {
    const k = address.toLowerCase();
    let b = this.boxes.get(k);
    if (!b) {
      b = { uidValidity: '1', uidNext: 1, mails: [] };
      this.boxes.set(k, b);
      if (this.greeting) this.push(b, { from: { address: this.greeting.from, name: this.greeting.name }, subject: this.greeting.subject, text: this.greeting.text });
    }
    return b;
  }

  private check(c: MailCredentials) {
    if (c.imap_host !== FAKE_MAIL_HOST && !c.imap_host.endsWith('.fake.test')) throw new MailConnectError('imap', 'getaddrinfo ENOTFOUND');
    if (c.password !== FAKE_MAIL_PASSWORD) throw new MailAuthError('imap');
  }

  private push(b: Box, m: Partial<ParsedMail> & Pick<ParsedMail, 'from' | 'subject' | 'text'>): ParsedMail {
    const mail: ParsedMail = { uid: b.uidNext++, messageId: `<${randomUUID()}@fake.test>`, references: [], to: [], date: new Date(), attachments: [], ...m };
    b.mails.push(mail);
    return mail;
  }

  /** Bơm một thư vào INBOX của `address` (khách gửi tới). */
  deliver(address: string, m: Partial<ParsedMail> & Pick<ParsedMail, 'from' | 'subject' | 'text'>): ParsedMail {
    return this.push(this.box(address), m);
  }

  /** Đổi UIDVALIDITY (hộp thư bị tạo lại phía máy chủ). */
  resetValidity(address: string): void {
    const b = this.box(address);
    b.uidValidity = String(Number(b.uidValidity) + 1);
  }

  reset(): void {
    this.boxes.clear();
    this.sent.length = 0;
    this.greeting = undefined;
  }

  async verify(c: MailCredentials): Promise<void> {
    this.check(c);
    this.box(c.address);
  }

  async fetch(c: MailCredentials, from: { uidValidity?: string; sinceUid?: number; since: Date }, limit: number): Promise<FetchResult> {
    this.check(c);
    const b = this.box(c.address);
    const same = from.uidValidity === b.uidValidity && !!from.sinceUid;
    const mails = b.mails.filter((m) => (same ? m.uid >= from.sinceUid! : m.date >= from.since)).slice(0, limit);
    return { uidValidity: b.uidValidity, uidNext: b.uidNext, mails };
  }

  async send(c: MailCredentials, m: OutgoingMail): Promise<{ messageId: string }> {
    if (c.password !== FAKE_MAIL_PASSWORD) throw new MailAuthError('smtp');
    const messageId = m.messageId ?? `<${randomUUID()}@fake.test>`;
    this.sent.push({ ...m, messageId, account: c.address.toLowerCase() });
    return { messageId };
  }
}

export const fakeMailboxTransport = new FakeMailboxTransport();
