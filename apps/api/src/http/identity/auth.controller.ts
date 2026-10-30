// /v1/auth/* (Blueprint §4.2) — public, rate limit theo email + IP; luôn 204 với lệnh gửi mã / link (chống dò tài khoản).
import { Body, Controller, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import { AuthService, IDENTITY_ENV, InvitesService, OtpService, PASSWORD_MIN, SessionsService, normalizeEmail, type IdentityEnv, type LoginOutcome } from '@appchat/core';
import { AppError } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';
import { REFRESH_COOKIE, clearRefreshCookie, clientIp, parseBody, readCookie, setRefreshCookie } from './http-util';

// Chuẩn hoá (trim + chữ thường — DC-014) TRƯỚC khi kiểm định dạng.
const email = z.string().max(254).transform(normalizeEmail).pipe(z.email());
const password = z.string().min(PASSWORD_MIN).max(200);
const locale = z.enum(['vi', 'en']).default('vi');
const otpRequest = z.object({ email, purpose: z.enum(['register', 'login', 'reset']), locale });
const otpVerify = z.object({ email, code: z.string().regex(/^\d{6}$/), purpose: z.enum(['register', 'login']), locale });
const login = z.object({ email, password: z.string().min(1).max(200), remember: z.boolean().default(false) });

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(OtpService) private readonly otp: OtpService,
    @Inject(SessionsService) private readonly sessions: SessionsService,
    @Inject(InvitesService) private readonly invites: InvitesService,
    @Inject(IDENTITY_ENV) private readonly env: IdentityEnv,
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
  ) {}

  private get secure() {
    return this.env.COOKIE_SECURE === 'true';
  }

  private client(req: IncomingMessage) {
    const ua = req.headers['user-agent'];
    return { userAgent: Array.isArray(ua) ? ua[0] : ua, ip: clientIp(req) };
  }

  private signedIn(res: ServerResponse, o: LoginOutcome, extra: Record<string, unknown> = {}) {
    setRefreshCookie(res, o.refreshToken, o.refreshExpiresAt, this.secure);
    return { data: { access_token: o.accessToken, user: o.user, needs_password: o.needsPassword, ...extra } };
  }

  @Post('otp/request')
  @HttpCode(204)
  async otpRequest(@Body() raw: unknown, @Req() req: IncomingMessage): Promise<void> {
    const b = parseBody(otpRequest, raw);
    await this.otp.throttle(b.email, clientIp(req));
    // reset qua OTP = gửi link đặt lại (một luồng duy nhất cho quên mật khẩu).
    if (b.purpose === 'reset') await this.auth.requestReset(b.email);
    else await this.otp.request(b.email, b.purpose, b.locale);
  }

  @Post('otp/verify')
  @HttpCode(200)
  async otpVerify(@Body() raw: unknown, @Req() req: IncomingMessage, @Res({ passthrough: true }) res: ServerResponse) {
    const b = parseBody(otpVerify, raw);
    // Thử mã chỉ giới hạn theo IP; theo email đã có khoá 5 lần sai / mã (DC-022) — không ăn vào hạn mức gửi mã.
    await this.otp.throttleIp(clientIp(req));
    return this.signedIn(res, await this.auth.verifyOtp(b.email, b.code, b.purpose, b.locale, this.client(req)));
  }

  @Post('password/login')
  @HttpCode(200)
  async passwordLogin(@Body() raw: unknown, @Req() req: IncomingMessage, @Res({ passthrough: true }) res: ServerResponse) {
    const b = parseBody(login, raw);
    await this.otp.throttle(b.email, clientIp(req));
    return this.signedIn(res, await this.auth.passwordLogin(b.email, b.password, b.remember, this.client(req)));
  }

  @Post('password/set')
  @HttpCode(204)
  async passwordSet(@Body() raw: unknown, @Req() req: IncomingMessage): Promise<void> {
    const userId = await this.actors.user(req);
    await this.auth.setPassword(userId, parseBody(z.object({ password }), raw).password);
  }

  @Post('password/reset-request')
  @HttpCode(204)
  async resetRequest(@Body() raw: unknown, @Req() req: IncomingMessage): Promise<void> {
    const b = parseBody(z.object({ email }), raw);
    await this.otp.throttle(b.email, clientIp(req));
    await this.auth.requestReset(b.email);
  }

  @Post('password/reset')
  @HttpCode(204)
  async reset(@Body() raw: unknown): Promise<void> {
    const b = parseBody(z.object({ token: z.string().min(20).max(200), password }), raw);
    await this.auth.resetPassword(b.token, b.password);
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: IncomingMessage, @Res({ passthrough: true }) res: ServerResponse) {
    const token = readCookie(req, REFRESH_COOKIE);
    if (!token) throw new AppError('UNAUTHENTICATED', 401, { refresh: 'missing' });
    try {
      const s = await this.sessions.rotate(token, this.client(req));
      setRefreshCookie(res, s.refreshToken, s.refreshExpiresAt, this.secure);
      return { data: { access_token: s.accessToken } };
    } catch (e) {
      clearRefreshCookie(res, this.secure);
      throw e;
    }
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: IncomingMessage, @Res({ passthrough: true }) res: ServerResponse): Promise<void> {
    await this.sessions.end(readCookie(req, REFRESH_COOKIE));
    clearRefreshCookie(res, this.secure);
  }

  @Post('invite/accept')
  @HttpCode(200)
  async acceptInvite(@Body() raw: unknown, @Req() req: IncomingMessage) {
    const userId = await this.actors.user(req);
    const r = await this.invites.accept(userId, parseBody(z.object({ token: z.string().min(20).max(200) }), raw).token);
    return { data: { workspace_id: r.workspaceId, role: r.role } };
  }
}
