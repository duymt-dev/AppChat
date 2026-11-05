// Lời mời thành viên (Blueprint §2.2 `invite`). Token 32 byte, chỉ lưu sha256, hạn 7 ngày (DC-017).
// TIP-013: handler `member.invite` / `invite.revoke` gọi trong PlatformTx của action (`db` = ptx); mời lại cùng email thu hồi lời mời
// cũ còn chờ (một link hiệu lực / email). TIP-004 có accept (POST /v1/auth/invite/accept).
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { PlatformDb } from '@appchat/db';
import type { MailProvider } from '@appchat/integrations';
import { CLOCK, type Clock } from '../../kernel/clock';
import { uuidv7 } from '../../kernel/ids';
import { PLATFORM_DB } from '../../kernel/tenant/tenant.providers';
import type { IdentityEnv } from '../identity.env';
import { IDENTITY_ENV, MAIL_PROVIDER } from './identity.tokens';
import { newToken, normalizeEmail, sha256 } from './secrets';

export const INVITE_TTL_MS = 7 * 86_400_000;

type InviteDb = Pick<PlatformDb, 'user' | 'membership' | 'workspace' | 'invite'>;

@Injectable()
export class InvitesService {
  constructor(
    @Inject(PLATFORM_DB) private readonly db: PlatformDb,
    @Inject(MAIL_PROVIDER) private readonly mail: MailProvider,
    @Inject(IDENTITY_ENV) private readonly env: IdentityEnv,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * Tạo lời mời (KHÔNG gửi thư — TIP-045b: thư là hiệu ứng ngoài `identity.invite_mail` ghi cùng commit, gửi sau). Đã là thành viên active
   * → CONFLICT. `id` tất định từ thao tác (chạy lại pha nền tảng không sinh lời mời / token thứ hai). Trả token mở cho payload thư.
   */
  async create(workspaceId: string, invitedBy: string, input: { email: string; name?: string; role: string }, db: InviteDb = this.db, inviteId?: string) {
    const email = normalizeEmail(input.email);
    const now = this.clock.now();
    const existing = await db.user.findUnique({ where: { email }, select: { id: true, locale: true } });
    if (existing && (await db.membership.findFirst({ where: { workspaceId, userId: existing.id, status: 'active' } }))) {
      throw new AppError('CONFLICT', 409, { email: 'already_member' });
    }
    const ws = await db.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { name: true, locale: true } });
    // Chạy lại cùng thao tác: lời mời đã tạo → không thu hồi / tạo lại (token cũ vẫn nằm trong hiệu ứng thư đã ghi).
    const again = inviteId ? await db.invite.findUnique({ where: { id: inviteId } }) : null;
    if (again) return { inviteId: again.id, token: null, email, locale: existing?.locale ?? ws.locale, workspace: ws.name };
    await db.invite.updateMany({ where: { workspaceId, email, acceptedAt: null, revokedAt: null }, data: { revokedAt: now } });
    const token = newToken();
    const invite = await db.invite.create({
      data: {
        id: inviteId ?? uuidv7(now.getTime()),
        workspaceId,
        email,
        name: input.name ?? null,
        roleKey: input.role,
        tokenHash: sha256(token),
        invitedByUserId: invitedBy,
        expiresAt: new Date(now.getTime() + INVITE_TTL_MS),
      },
    });
    return { inviteId: invite.id, token: token as string | null, email, locale: existing?.locale ?? ws.locale, workspace: ws.name };
  }

  /** Lời mời còn chờ (chưa nhận / thu hồi / hết hạn) — tính vào hạn mức người dùng của gói. */
  pendingCount(workspaceId: string, now: Date, db: InviteDb = this.db, exceptEmail?: string): Promise<number> {
    return db.invite.count({
      where: { workspaceId, acceptedAt: null, revokedAt: null, expiresAt: { gt: now }, ...(exceptEmail ? { email: { not: normalizeEmail(exceptEmail) } } : {}) },
    });
  }

  async revoke(workspaceId: string, inviteId: string, db: InviteDb = this.db): Promise<void> {
    const r = await db.invite.updateMany({
      where: { id: inviteId, workspaceId, acceptedAt: null, revokedAt: null },
      data: { revokedAt: this.clock.now() },
    });
    if (r.count !== 1) throw new AppError('NOT_FOUND', 404, { invite_id: 'not_found' });
  }

  /** Nhận lời mời bằng tài khoản đang đăng nhập; email phải trùng email được mời. */
  async accept(userId: string, token: string): Promise<{ workspaceId: string; role: string }> {
    const now = this.clock.now();
    const inv = await this.db.invite.findUnique({ where: { tokenHash: sha256(token) } });
    if (!inv) throw new AppError('NOT_FOUND', 404, { token: 'invalid' });
    if (inv.acceptedAt || inv.revokedAt || inv.expiresAt <= now) throw new AppError('CONFLICT', 409, { token: inv.acceptedAt ? 'used' : inv.revokedAt ? 'revoked' : 'expired' });
    const user = await this.db.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
    if (user.email !== inv.email) throw new AppError('FORBIDDEN', 403, { email: 'mismatch' });
    await this.db.$transaction(async (tx) => {
      const claimed = await tx.invite.updateMany({ where: { id: inv.id, acceptedAt: null, revokedAt: null }, data: { acceptedAt: now } });
      if (claimed.count !== 1) throw new AppError('CONFLICT', 409, { token: 'used' });
      await tx.membership.upsert({
        where: { workspaceId_userId: { workspaceId: inv.workspaceId, userId } },
        create: { workspaceId: inv.workspaceId, userId, roleKey: inv.roleKey, status: 'active', joinedAt: now },
        update: { roleKey: inv.roleKey, status: 'active', joinedAt: now },
      });
      await tx.user.update({ where: { id: userId }, data: { lastWorkspaceId: inv.workspaceId, emailVerifiedAt: now } });
      await tx.workspace.update({ where: { id: inv.workspaceId }, data: { authzEpoch: { increment: 1 } } });
    });
    return { workspaceId: inv.workspaceId, role: inv.roleKey };
  }
}
