// MailboxTransport thật (TIP-018, Blueprint §6): IMAP bằng imapflow (mở INBOX, lấy theo UID / ngày, chỉ đọc — không đánh dấu đã
// đọc phía hộp thư), phân tích MIME bằng mailparser, gửi SMTP bằng nodemailer. Mỗi lần poll một kết nối ngắn (poll 60 giây).
// Duy nhất file này import thư viện mail (core không biết SDK — omnichannel-adapter).
import { ImapFlow } from 'imapflow';
import { simpleParser, type AddressObject } from 'mailparser';
import nodemailer from 'nodemailer';
import { refuseFileFetch, type FileFetcher } from '../zalo-personal/adapter';
import { MailAuthError, MailConnectError, type FetchResult, type MailCredentials, type MailboxTransport, type OutgoingMail, type ParsedMail } from './transport';

const TIMEOUT_MS = 20_000;
/** Thư lớn hơn bỏ phần thân (chỉ lấy header) — tránh tải tệp đính kèm khổng lồ mỗi lượt poll. */
const MAX_SOURCE = 10 * 1024 * 1024;

const isAuth = (err: unknown) => {
  const e = err as { authenticationFailed?: boolean; responseCode?: number; code?: string; response?: string };
  return !!e?.authenticationFailed || e?.code === 'EAUTH' || e?.responseCode === 535 || /AUTHENTICATIONFAILED|Invalid credentials/i.test(String(e?.response ?? ''));
};

function imap(c: MailCredentials): ImapFlow {
  return new ImapFlow({
    host: c.imap_host,
    port: c.imap_port,
    secure: c.imap_port === 993,
    auth: { user: c.user || c.address, pass: c.password },
    logger: false,
    connectionTimeout: TIMEOUT_MS,
    greetingTimeout: TIMEOUT_MS,
    socketTimeout: 60_000,
  });
}

function smtp(c: MailCredentials) {
  return nodemailer.createTransport({
    host: c.smtp_host,
    port: c.smtp_port,
    secure: c.smtp_port === 465,
    auth: { user: c.user || c.address, pass: c.password },
    connectionTimeout: TIMEOUT_MS,
    greetingTimeout: TIMEOUT_MS,
  });
}

async function withImap<T>(c: MailCredentials, fn: (client: ImapFlow) => Promise<T>): Promise<T> {
  const client = imap(c);
  client.on('error', () => undefined);
  try {
    await client.connect();
  } catch (err) {
    throw isAuth(err) ? new MailAuthError('imap') : new MailConnectError('imap', (err as Error).message?.slice(0, 120));
  }
  try {
    return await fn(client);
  } finally {
    await client.logout().catch(() => client.close());
  }
}

const first = (a: AddressObject | AddressObject[] | undefined) => (Array.isArray(a) ? a[0] : a)?.value[0];
const all = (a: AddressObject | AddressObject[] | undefined) => (Array.isArray(a) ? a : a ? [a] : []).flatMap((x) => x.value.map((v) => v.address ?? '')).filter(Boolean);
const refsOf = (r: string | string[] | undefined) => (Array.isArray(r) ? r : r ? r.split(/\s+/) : []).filter(Boolean);

async function parse(uid: number, source: Buffer): Promise<ParsedMail | null> {
  const m = await simpleParser(source, { skipImageLinks: true, skipTextToHtml: true });
  const from = first(m.from);
  if (!from?.address || !m.messageId) return null;
  return {
    uid,
    messageId: m.messageId,
    ...(m.inReplyTo ? { inReplyTo: m.inReplyTo } : {}),
    references: refsOf(m.references),
    from: { address: from.address, ...(from.name ? { name: from.name } : {}) },
    to: all(m.to),
    subject: m.subject ?? '',
    text: m.text ?? '',
    ...(typeof m.html === 'string' ? { html: m.html } : {}),
    date: m.date ?? new Date(),
    attachments: m.attachments.map((a) => ({ ...(a.filename ? { name: a.filename } : {}), mime: a.contentType, size: a.size })),
  };
}

export class ImapMailboxTransport implements MailboxTransport {
  /** Tải tệp đính kèm khi gửi — core cấp `attachmentFetcher` (TIP-045b); không cấp → từ chối gửi kèm tệp. */
  constructor(private readonly files: FileFetcher = refuseFileFetch) {}

  async verify(c: MailCredentials): Promise<void> {
    await withImap(c, async () => undefined);
    const t = smtp(c);
    try {
      await t.verify();
    } catch (err) {
      throw isAuth(err) ? new MailAuthError('smtp') : new MailConnectError('smtp', (err as Error).message?.slice(0, 120));
    } finally {
      t.close();
    }
  }

  async fetch(c: MailCredentials, from: { uidValidity?: string; sinceUid?: number; since: Date }, limit: number): Promise<FetchResult> {
    return withImap(c, async (client) => {
      const lock = await client.getMailboxLock('INBOX', { readOnly: true });
      try {
        const box = client.mailbox;
        if (!box) return { uidValidity: '', uidNext: from.sinceUid ?? 1, mails: [] };
        const validity = String(box.uidValidity);
        const sameBox = from.uidValidity === validity && !!from.sinceUid;
        const uids = sameBox
          ? box.uidNext > from.sinceUid! ? ((await client.search({ uid: `${from.sinceUid}:*` }, { uid: true })) || []).filter((u) => u >= from.sinceUid!) : []
          : (await client.search({ since: from.since }, { uid: true })) || [];
        const pick = uids.sort((a, b) => a - b).slice(0, limit);
        const mails: ParsedMail[] = [];
        if (pick.length) {
          for await (const msg of client.fetch(pick.join(','), { uid: true, source: { maxLength: MAX_SOURCE } }, { uid: true })) {
            if (!msg.source) continue;
            const p = await parse(msg.uid, msg.source).catch(() => null);
            if (p) mails.push(p);
          }
        }
        mails.sort((a, b) => a.uid - b.uid);
        return { uidValidity: validity, uidNext: box.uidNext, mails };
      } finally {
        lock.release();
      }
    });
  }

  async send(c: MailCredentials, m: OutgoingMail): Promise<{ messageId: string }> {
    const t = smtp(c);
    try {
      const attachments = await Promise.all((m.attachments ?? []).map(async (a) => ({ filename: a.name, contentType: a.mime, content: await this.files(a.url, a) })));
      const info = await t.sendMail({
        from: m.from.name ? { name: m.from.name, address: m.from.address } : m.from.address,
        to: m.to,
        subject: m.subject,
        text: m.text,
        ...(m.html ? { html: m.html } : {}),
        ...(m.inReplyTo ? { inReplyTo: m.inReplyTo } : {}),
        ...(m.references?.length ? { references: m.references } : {}),
        ...(m.messageId ? { messageId: m.messageId } : {}),
        ...(attachments.length ? { attachments } : {}),
      });
      return { messageId: info.messageId };
    } catch (err) {
      throw isAuth(err) ? new MailAuthError('smtp') : err;
    } finally {
      t.close();
    }
  }
}
