// Transport SMTP của DN (TIP-012c §1.4): mỗi lần mở = phân giải lại + ghim IP công khai (network/smtp-target.ts) + TLS bắt buộc theo cổng,
// đăng nhập bằng khoá của ĐÚNG kết nối. Core tạo bằng `tenantSmtpFactory(resolve)` rồi tiêm vào MailTransports.smtp. Test tiêm `create`
// (transport giả) — không mạng thật. Không nhận tuỳ chọn transport / socket tuỳ ý từ cấu hình.
import nodemailer from 'nodemailer';
import { ProviderError } from '../../provider-errors';
import type { ConnectionCtx } from '../../types';
import type { SmtpSend, SmtpSendInfo } from '../../ports/tenant-mail';
import { resolveSmtpTarget, smtpTransportOptions, SmtpTargetError, type SmtpResolver } from '../../network/smtp-target';

type Opts = ReturnType<typeof smtpTransportOptions>;
export interface SmtpTransportLike {
  verify(): Promise<unknown>;
  sendMail(m: Record<string, unknown>): Promise<{ accepted?: unknown[]; rejected?: unknown[]; response?: string; messageId?: string }>;
  close(): void;
}

const addr = (x: unknown) => (typeof x === 'string' ? x : x && typeof x === 'object' && 'address' in x ? String((x as { address: unknown }).address) : '');

/** `verify` = probe (mở + TLS + AUTH, không gửi); lỗi đích / TLS / đăng nhập → ProviderError đã làm sạch. */
export function tenantSmtpFactory(resolve: SmtpResolver, create: (o: Opts) => SmtpTransportLike = (o) => nodemailer.createTransport(o) as unknown as SmtpTransportLike) {
  return async (conn: ConnectionCtx): Promise<SmtpSend> => {
    let target;
    try {
      target = await resolveSmtpTarget(conn.config.host ?? '', conn.config.port ?? '', resolve);
    } catch (e) {
      throw new ProviderError(e instanceof SmtpTargetError && e.reason === 'dns' ? 'provider_unavailable' : 'unsupported', e instanceof SmtpTargetError ? e.reason : 'host');
    }
    const t = create(smtpTransportOptions(target, { user: conn.config.username ?? '', pass: conn.secrets.password ?? '' }));
    try {
      await t.verify();
    } catch (e) {
      t.close();
      const code = (e as { code?: string; responseCode?: number }).code;
      throw new ProviderError(code === 'EAUTH' ? 'auth_failed' : code === 'ETIMEDOUT' ? 'timeout' : 'provider_unavailable');
    }
    return async (m): Promise<SmtpSendInfo> => {
      try {
        const info = await t.sendMail({ ...m, disableFileAccess: true, disableUrlAccess: true });
        return { accepted: (info.accepted ?? []).map(addr), rejected: (info.rejected ?? []).map(addr), response: String(info.response ?? ''), messageId: String(info.messageId ?? m.messageId) };
      } finally {
        t.close();
      }
    };
  };
}
