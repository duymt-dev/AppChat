// Port hộp thư cho adapter Email (TIP-018, Blueprint §6): đăng nhập IMAP / SMTP, lấy thư mới theo UID, gửi thư. Bản thật dùng
// imapflow + mailparser + nodemailer (imap-transport.ts); bản giả cho test / E2E (fake-transport.ts) — core không biết thư viện.

export interface MailCredentials {
  /** Địa chỉ hộp thư (cũng là tên đăng nhập mặc định). */
  address: string;
  imap_host: string;
  imap_port: number;
  /** Tên đăng nhập IMAP / SMTP nếu khác địa chỉ. */
  user?: string;
  password: string;
  smtp_host: string;
  smtp_port: number;
}

/** Thư đã phân tích (header thread + nội dung text). */
export interface ParsedMail {
  uid: number;
  messageId: string;
  inReplyTo?: string;
  references: string[];
  from: { address: string; name?: string };
  to: string[];
  subject: string;
  text: string;
  html?: string;
  date: Date;
  attachments: { name?: string; mime: string; size: number }[];
}

export interface FetchResult {
  /** UIDVALIDITY của INBOX — đổi thì mốc UID cũ vô nghĩa (đồng bộ lại theo ngày). */
  uidValidity: string;
  /** UID kế tiếp (mốc cho lần poll sau). */
  uidNext: number;
  mails: ParsedMail[];
}

export interface OutgoingMail {
  from: { address: string; name?: string };
  to: string;
  subject: string;
  text: string;
  html?: string;
  inReplyTo?: string;
  references?: string[];
  /** Message-ID đặt trước (thư mở chuỗi mới — khớp thread id của hội thoại). */
  messageId?: string;
  attachments?: { url: string; name?: string; mime: string; fileId?: string; sha256?: string }[];
}

export interface MailboxTransport {
  /** Đăng nhập IMAP + SMTP thật (kiểm tra trước khi lưu — Blueprint §6). Sai → MailAuthError / MailConnectError. */
  verify(c: MailCredentials): Promise<void>;
  /** Thư INBOX có UID ≥ `sinceUid` (cùng `uidValidity`) hoặc từ ngày `since` khi chưa có mốc / UIDVALIDITY đổi. */
  fetch(c: MailCredentials, from: { uidValidity?: string; sinceUid?: number; since: Date }, limit: number): Promise<FetchResult>;
  /** Gửi SMTP → Message-ID của thư vừa gửi. */
  send(c: MailCredentials, m: OutgoingMail): Promise<{ messageId: string }>;
}

/** Sai tên đăng nhập / mật khẩu (IMAP / SMTP từ chối). */
export class MailAuthError extends Error {
  constructor(
    readonly side: 'imap' | 'smtp',
    message = `${side}_auth`,
  ) {
    super(message);
    this.name = 'MailAuthError';
  }
}

/** Không kết nối được máy chủ (host / cổng / TLS / mạng). */
export class MailConnectError extends Error {
  constructor(
    readonly side: 'imap' | 'smtp',
    message = `${side}_connect`,
  ) {
    super(message);
    this.name = 'MailConnectError';
  }
}
