// Adapter Email (TIP-018, Blueprint §6): session `poll` — worker ROLE=channels gọi `start` (nạp credential vào bộ nhớ) khi tài khoản
// chạy, `poll` mỗi 60 giây (thư mới theo mốc UID → NormalizedInbound), `send` qua SMTP với header thread (`meta` do core dựng:
// tiêu đề, In-Reply-To, References, Message-ID cho thư mở chuỗi mới). Sai đăng nhập → ChannelAuthError (worker chuyển `expired`).
import { ChannelAuthError, ChannelNotRunningError, type ChannelAccountRuntime, type ChannelAdapter, type HealthStatus, type InboundSink, type NormalizedInbound, type OutboundMessage } from '../types';
import { emailManifest } from './manifest';
import { normalizeMail } from './normalize';
import { MailAuthError, type MailCredentials, type MailboxTransport } from './transport';

/** Mốc poll lưu ở core (`channel_account.settings.poll_cursor`). */
export interface MailCursor {
  uidValidity?: string;
  sinceUid?: number;
}

/** `OutboundMessage.meta` của kênh email (core channels/email dựng từ `email_thread`). */
export interface EmailSendMeta {
  subject?: string;
  inReplyTo?: string;
  references?: string[];
  /** Thư mở chuỗi mới (contact.send_email): Message-ID đặt trước = thread id của hội thoại. */
  messageId?: string;
}

const POLL_LIMIT = 100;

export class EmailAdapter implements ChannelAdapter {
  readonly manifest = emailManifest;
  private readonly accounts = new Map<string, { creds: MailCredentials; sink?: InboundSink; historyDays: number }>();

  constructor(private readonly transport: MailboxTransport) {}

  async start(account: ChannelAccountRuntime, sink: InboundSink): Promise<void> {
    const days = Number(account.settings.history_days ?? 30);
    this.accounts.set(account.id, { creds: account.credentials as MailCredentials, sink, historyDays: Number.isFinite(days) ? days : 30 });
  }

  async stop(accountId: string): Promise<void> {
    this.accounts.delete(accountId);
  }

  private held(accountId: string) {
    const a = this.accounts.get(accountId);
    if (!a) throw new ChannelNotRunningError(accountId);
    return a;
  }

  /** Thư mới từ mốc (lần đầu / UIDVALIDITY đổi: từ `history_days` ngày trước). */
  async poll(accountId: string, cursor: unknown, now: Date = new Date()): Promise<{ messages: NormalizedInbound[]; cursor: MailCursor }> {
    const a = this.held(accountId);
    const c = (cursor ?? null) as MailCursor | null;
    const since = new Date(now.getTime() - Math.max(a.historyDays, 1) * 86_400_000);
    try {
      const r = await this.transport.fetch(a.creds, { uidValidity: c?.uidValidity, sinceUid: c?.sinceUid, since }, POLL_LIMIT);
      const messages = r.mails.map((m) => normalizeMail(accountId, a.creds.address, m)).filter((m): m is NormalizedInbound => !!m);
      // Còn thư chưa lấy hết (giới hạn mỗi lượt): mốc = UID lớn nhất đã lấy + 1, lượt sau lấy tiếp.
      const last = r.mails.at(-1)?.uid;
      const next = r.mails.length >= POLL_LIMIT && last ? last + 1 : r.uidNext;
      return { messages, cursor: { uidValidity: r.uidValidity, sinceUid: next } };
    } catch (err) {
      if (err instanceof MailAuthError) throw new ChannelAuthError('email_auth');
      throw err;
    }
  }

  async send(accountId: string, msg: OutboundMessage): Promise<{ externalMsgId: string }> {
    const a = this.held(accountId);
    const meta = (msg.meta ?? {}) as EmailSendMeta;
    const subject = meta.subject ?? '';
    try {
      const r = await this.transport.send(a.creds, {
        from: { address: a.creds.address },
        to: msg.externalThreadTo ?? '',
        subject: meta.inReplyTo && subject && !/^re:/i.test(subject) ? `Re: ${subject}` : subject,
        text: msg.text ?? '',
        ...(meta.inReplyTo ? { inReplyTo: meta.inReplyTo } : {}),
        ...(meta.references?.length ? { references: meta.references } : {}),
        ...(meta.messageId ? { messageId: meta.messageId } : {}),
        ...(msg.attachments?.length ? { attachments: msg.attachments } : {}),
      });
      return { externalMsgId: r.messageId };
    } catch (err) {
      if (err instanceof MailAuthError) throw new ChannelAuthError('email_auth');
      throw err;
    }
  }

  async probe(accountId: string): Promise<HealthStatus> {
    const a = this.accounts.get(accountId);
    if (!a) return 'error';
    try {
      await this.transport.verify(a.creds);
      return 'connected';
    } catch (err) {
      return err instanceof MailAuthError ? 'expired' : 'error';
    }
  }

  /** Kiểm tra form trước khi lưu (channel.test / channel.email.connect). */
  verify(creds: MailCredentials): Promise<void> {
    return this.transport.verify(creds);
  }
}
