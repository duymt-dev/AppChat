// Luồng đăng ký / đăng nhập / mật khẩu (Blueprint §4.2, REQ-A01). Lỗi xác thực luôn cùng một dạng (không lộ email nào tồn tại).
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { PlatformDb } from '@appchat/db';
import type { MailProvider } from '@appchat/integrations';
import { CLOCK, type Clock } from '../../kernel/clock';
import { uuidv7 } from '../../kernel/ids';
import { PLATFORM_DB } from '../../kernel/tenant/tenant.providers';
import type { IdentityEnv } from '../identity.env';
import { IDENTITY_ENV, MAIL_PROVIDER } from './identity.tokens';
import { resetMail } from './mail-templates';
import { OtpService, type OtpPurpose } from './otp.service';
import { hashPassword, newToken, sha256, verifyPassword } from './secrets';
import { SessionsService, type ClientInfo, type IssuedSession } from './sessions.service';

export const RESET_TTL_MS = 15 * 60_000;
export const PASSWORD_MIN = 8;

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatar_url: string | null;
  locale: string;
}

export interface LoginOutcome extends IssuedSession {
  user: PublicUser;
  needsPassword: boolean;
}

const nameFromEmail = (email: string) => email.split('@')[0]!.slice(0, 120);

@Injectable()
export class AuthService {
  constructor(
    @Inject(PLATFORM_DB) private readonly db: PlatformDb,
    @Inject(OtpService) private readonly otp: OtpService,
    @Inject(SessionsService) private readonly sessions: SessionsService,
    @Inject(MAIL_PROVIDER) private readonly mail: MailProvider,
    @Inject(IDENTITY_ENV) private readonly env: IdentityEnv,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** OTP verify: register tạo user (đã xác thực email); login cần user có sẵn. Remember mặc định 30 ngày cho đăng nhập OTP. */
  async verifyOtp(email: string, code: string, purpose: Exclude<OtpPurpose, 'reset'>, locale: string, client: ClientInfo): Promise<LoginOutcome> {
    await this.otp.verify(email, purpose, code);
    const now = this.clock.now();
    let user = await this.db.user.findUnique({ where: { email } });
    if (purpose === 'register') {
      user ??= await this.db.user.create({
        data: { id: uuidv7(now.getTime()), email, name: nameFromEmail(email), locale: locale === 'en' ? 'en' : 'vi', emailVerifiedAt: now },
      });
    }
    if (!user) throw new AppError('UNAUTHENTICATED', 401, { code: 'invalid' });
    if (!user.emailVerifiedAt) user = await this.db.user.update({ where: { id: user.id }, data: { emailVerifiedAt: now } });
    const s = await this.sessions.start(user.id, true, client);
    return { ...s, user: toPublic(user), needsPassword: !user.passwordHash };
  }

  async passwordLogin(email: string, password: string, remember: boolean, client: ClientInfo): Promise<LoginOutcome> {
    const user = await this.db.user.findUnique({ where: { email } });
    // verifyPassword luôn chạy argon2 (kể cả user không có) → thời gian như nhau.
    if (!(await verifyPassword(password, user?.passwordHash)) || !user) throw new AppError('UNAUTHENTICATED', 401, { credentials: 'invalid' });
    const s = await this.sessions.start(user.id, remember, client);
    return { ...s, user: toPublic(user), needsPassword: false };
  }

  async setPassword(userId: string, password: string): Promise<void> {
    await this.db.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(password) } });
  }

  /** Quên mật khẩu: chỉ gửi khi email có user; token link 15 phút lưu ở otp_code (purpose reset). */
  async requestReset(email: string): Promise<boolean> {
    const user = await this.db.user.findUnique({ where: { email }, select: { locale: true } });
    if (!user) return false;
    const token = newToken();
    await this.db.otpCode.create({
      data: { id: uuidv7(), email, purpose: 'reset', codeHash: sha256(token), expiresAt: new Date(this.clock.now().getTime() + RESET_TTL_MS) },
    });
    const url = `${this.env.APP_PUBLIC_URL}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
    await this.mail.send(resetMail(email, user.locale, url));
    return true;
  }

  /** Token = khoá tra cứu (hash unique theo token), không cần email; đặt mật khẩu + thu hồi mọi phiên. */
  async resetPassword(token: string, password: string): Promise<void> {
    const now = this.clock.now();
    const row = await this.db.otpCode.findFirst({ where: { purpose: 'reset', codeHash: sha256(token), consumedAt: null } });
    if (!row || row.expiresAt <= now) throw new AppError('UNAUTHENTICATED', 401, { token: 'invalid' });
    const done = await this.db.otpCode.updateMany({ where: { id: row.id, consumedAt: null }, data: { consumedAt: now } });
    if (done.count !== 1) throw new AppError('UNAUTHENTICATED', 401, { token: 'invalid' });
    const user = await this.db.user.update({ where: { email: row.email }, data: { passwordHash: await hashPassword(password), emailVerifiedAt: now } });
    await this.sessions.revokeAll(user.id);
  }

  async user(userId: string): Promise<PublicUser> {
    const u = await this.db.user.findUnique({ where: { id: userId } });
    if (!u) throw new AppError('UNAUTHENTICATED', 401);
    return toPublic(u);
  }
}

export function toPublic(u: { id: string; email: string; name: string; phone: string | null; avatarUrl: string | null; locale: string }): PublicUser {
  return { id: u.id, email: u.email, name: u.name, phone: u.phone, avatar_url: u.avatarUrl, locale: u.locale };
}
