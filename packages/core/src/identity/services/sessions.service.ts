// Phiên (Blueprint §4.2): access JWT 15 phút + refresh token xoay vòng theo family. Dùng lại token đã xoay → thu hồi cả family.
// Refresh 32 byte ngẫu nhiên, chỉ lưu sha256. "Ghi nhớ" 30 ngày, không thì 1 ngày (DC-016).
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { PlatformDb } from '@appchat/db';
import { CLOCK, type Clock } from '../../kernel/clock';
import { uuidv7 } from '../../kernel/ids';
import { PLATFORM_DB } from '../../kernel/tenant/tenant.providers';
import { AccessTokens } from './access-tokens';
import { newToken, sha256 } from './secrets';

export const REFRESH_TTL_MS = { remember: 30 * 86_400_000, session: 86_400_000 } as const;

export interface IssuedSession {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

export interface ClientInfo {
  userAgent?: string;
  ip?: string;
}

/** Định danh thiết bị có chặn: 16 hex đầu của sha256(user-agent) — không lưu dấu vân tay / IP thô vào audit. */
export const deviceId = (userAgent: string | undefined) => sha256((userAgent ?? '').slice(0, 255)).slice(0, 16);

/**
 * Đăng nhập từ thiết bị chưa từng có phiên (TIP-045b annex A2, ops §4): ghi `platform_audit_log` `session.new_device` cho mỗi workspace
 * user đang active (≤ 20) — Cài đặt › Audit log của workspace đó thấy. Lần đăng nhập đầu tiên của tài khoản không tính.
 */
async function recordNewDevice(db: PlatformDb, userId: string, userAgent: string | undefined, now: Date): Promise<void> {
  const ua = userAgent?.slice(0, 255) ?? null;
  const [seen, any] = await Promise.all([db.refreshToken.findFirst({ where: { userId, userAgent: ua }, select: { id: true } }), db.refreshToken.findFirst({ where: { userId }, select: { id: true } })]);
  if (seen || !any) return;
  const ws = await db.membership.findMany({ where: { userId, status: 'active' }, select: { workspaceId: true }, take: 20 });
  if (!ws.length) return;
  const device = deviceId(userAgent);
  await db.platformAuditLog.createMany({
    data: ws.map((m) => ({ id: uuidv7(now.getTime()), actorUserId: userId, actionId: 'session.new_device', workspaceId: m.workspaceId, input: { device }, createdAt: now })),
  });
}

@Injectable()
export class SessionsService {
  constructor(
    @Inject(PLATFORM_DB) private readonly db: PlatformDb,
    @Inject(AccessTokens) private readonly access: AccessTokens,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** Đăng nhập xong: family mới. */
  async start(userId: string, remember: boolean, client: ClientInfo = {}): Promise<IssuedSession> {
    const now = this.clock.now();
    await this.db.user.update({ where: { id: userId }, data: { lastLoginAt: now } });
    await recordNewDevice(this.db, userId, client.userAgent, now);
    return this.issue(userId, uuidv7(), now.getTime() + (remember ? REFRESH_TTL_MS.remember : REFRESH_TTL_MS.session), client);
  }

  /** Xoay vòng: token hợp lệ → đánh dấu đã xoay + phát token mới cùng family, giữ nguyên hạn của family. */
  async rotate(refreshToken: string, client: ClientInfo = {}): Promise<IssuedSession & { userId: string }> {
    const now = this.clock.now();
    const row = await this.db.refreshToken.findUnique({ where: { tokenHash: sha256(refreshToken) } });
    if (!row || row.revokedAt || row.expiresAt <= now) throw new AppError('UNAUTHENTICATED', 401, { refresh: 'invalid' });
    // Đã xoay mà bị dùng lại → nghi bị đánh cắp: thu hồi cả family (Blueprint §4.2).
    const claimed = await this.db.refreshToken.updateMany({ where: { id: row.id, rotatedAt: null, revokedAt: null }, data: { rotatedAt: now } });
    if (claimed.count !== 1) {
      await this.revokeFamily(row.familyId);
      throw new AppError('UNAUTHENTICATED', 401, { refresh: 'reused' });
    }
    return { userId: row.userId, ...(await this.issue(row.userId, row.familyId, row.expiresAt.getTime(), client)) };
  }

  /** Logout: thu hồi family của token (token lạ → bỏ qua, vẫn 204). */
  async end(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    const row = await this.db.refreshToken.findUnique({ where: { tokenHash: sha256(refreshToken) }, select: { familyId: true } });
    if (row) await this.revokeFamily(row.familyId);
  }

  /** Đặt lại mật khẩu → thu hồi mọi phiên của user. */
  async revokeAll(userId: string): Promise<void> {
    await this.db.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: this.clock.now() } });
  }

  accessFor(userId: string): string {
    return this.access.issue(userId, this.clock.now().getTime()).token;
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.db.refreshToken.updateMany({ where: { familyId, revokedAt: null }, data: { revokedAt: this.clock.now() } });
  }

  private async issue(userId: string, familyId: string, expiresMs: number, client: ClientInfo): Promise<IssuedSession> {
    const refreshToken = newToken();
    const refreshExpiresAt = new Date(expiresMs);
    await this.db.refreshToken.create({
      data: {
        id: uuidv7(),
        userId,
        tokenHash: sha256(refreshToken),
        familyId,
        expiresAt: refreshExpiresAt,
        userAgent: client.userAgent?.slice(0, 255) ?? null,
        ip: client.ip ?? null,
      },
    });
    return { accessToken: this.accessFor(userId), refreshToken, refreshExpiresAt };
  }
}
