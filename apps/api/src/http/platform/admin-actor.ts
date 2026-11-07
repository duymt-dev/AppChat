// Người gọi route quản trị nền tảng (TIP-040): JWT hợp lệ + `is_platform_admin` đọc SỐNG ở DB nền tảng mỗi request (thu hồi có hiệu lực
// ngay). Không X-Workspace-Id / membership; không có cách tự cấp quyền admin qua API / UI.
import type { IncomingMessage } from 'node:http';
import type { PlatformDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { ActorResolver } from '../kernel/request-actor';

export async function platformAdmin(actors: Pick<ActorResolver, 'user'>, platform: Pick<PlatformDb, 'user'>, req: IncomingMessage): Promise<string> {
  const userId = await actors.user(req);
  const u = await platform.user.findUnique({ where: { id: userId }, select: { isPlatformAdmin: true } });
  if (!u?.isPlatformAdmin) throw new AppError('FORBIDDEN', 403, { permission: 'platform_admin' });
  return userId;
}
