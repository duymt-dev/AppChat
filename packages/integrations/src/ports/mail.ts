// Port `mail` (provider-ports §1): email hệ thống — OTP, mời, đặt lại mật khẩu, thông báo. Core chỉ biết interface này.
export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Nhãn để provider gom thống kê (otp, invite, reset…) — không chứa PII. */
  tag: string;
}

export interface MailProvider {
  readonly key: string;
  send(msg: MailMessage): Promise<{ id: string }>;
}

export class MailSendError extends Error {
  constructor(
    readonly provider: string,
    readonly status: number,
  ) {
    super(`mail ${provider} lỗi ${status}`);
    this.name = 'MailSendError';
  }
}
