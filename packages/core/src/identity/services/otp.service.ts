// OTP email 6 số (REQ-A01, Blueprint §4.2): lưu sha256, hạn 10 phút, sai 5 lần → khoá mã; rate limit 5 / 15 phút / email + 20 / giờ / IP.
// Chống dò tài khoản: chỗ gọi luôn trả 204 — service chỉ gửi mail khi purpose khớp trạng thái user.
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { PlatformDb } from '@appchat/db';
import type { MailProvider } from '@appchat/integrations';
import { CLOCK, type Clock } from '../../kernel/clock';
import { uuidv7 } from '../../kernel/ids';
import type { RateLimiter } from '../../kernel/rate-limit';
import { PLATFORM_DB } from '../../kernel/tenant/tenant.providers';
import { MAIL_PROVIDER, RATE_LIMITER } from './identity.tokens';
import { otpMail } from './mail-templates';
import { newOtp, sameHash, sha256 } from './secrets';

export type OtpPurpose = 'register' | 'login' | 'reset';
export const OTP_TTL_MS = 10 * 60_000;
export const OTP_MAX_ATTEMPTS = 5;
export const AUTH_RULES = {
  email: { name: 'auth:email', limit: 5, windowMs: 15 * 60_000 },
  ip: { name: 'auth:ip', limit: 20, windowMs: 60 * 60_000 },
} as const;

@Injectable()
export class OtpService {
  constructor(
    @Inject(PLATFORM_DB) private readonly db: PlatformDb,
    @Inject(MAIL_PROVIDER) private readonly mail: MailProvider,
    @Inject(RATE_LIMITER) private readonly limiter: RateLimiter,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** Rate limit chung cho mọi lệnh auth theo email + IP (băm, không giữ PII trong khoá Redis). */
  async throttle(email: string, ip: string | undefined): Promise<void> {
    await this.limiter.hit(AUTH_RULES.email, sha256(email));
    await this.throttleIp(ip);
  }

  async throttleIp(ip: string | undefined): Promise<void> {
    if (ip) await this.limiter.hit(AUTH_RULES.ip, sha256(ip));
  }

  /** Gửi mã khi purpose hợp với trạng thái tài khoản (register: chưa có user; login / reset: đã có). */
  async request(email: string, purpose: Exclude<OtpPurpose, 'reset'>, locale: string): Promise<boolean> {
    const user = await this.db.user.findUnique({ where: { email }, select: { id: true, locale: true } });
    if (purpose === 'register' ? user : !user) return false;
    const code = newOtp();
    await this.db.otpCode.create({
      data: { id: uuidv7(), email, purpose, codeHash: sha256(code), expiresAt: new Date(this.clock.now().getTime() + OTP_TTL_MS) },
    });
    await this.mail.send(otpMail(email, user?.locale ?? locale, code));
    return true;
  }

  /** Kiểm mã mới nhất còn hạn; sai → attempts++ (tới 5 thì mã chết). Sai / hết hạn / không có → UNAUTHENTICATED. */
  async verify(email: string, purpose: OtpPurpose, code: string): Promise<void> {
    const now = this.clock.now();
    const row = await this.db.otpCode.findFirst({
      where: { email, purpose, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!row || row.expiresAt <= now || row.attempts >= OTP_MAX_ATTEMPTS) throw new AppError('UNAUTHENTICATED', 401, { code: 'invalid' });
    if (!sameHash(row.codeHash, sha256(code))) {
      await this.db.otpCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
      throw new AppError('UNAUTHENTICATED', 401, { code: 'invalid' });
    }
    // Tiêu mã có điều kiện (chống hai request song song cùng mã).
    const done = await this.db.otpCode.updateMany({ where: { id: row.id, consumedAt: null }, data: { consumedAt: now } });
    if (done.count !== 1) throw new AppError('UNAUTHENTICATED', 401, { code: 'invalid' });
  }
}
