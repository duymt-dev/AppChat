// Kiểm thẩm quyền HIỆN TẠI ngay trước khi gửi (TIP-006b §3.2–3.3): workspace còn, người nhận còn là thành viên active, còn quyền theo
// chính sách đã ghi (permission key / Owner), Owner hiện tại cho mục tiêu biểu tượng, nguồn (event) còn và chưa bị xoá theo "Quên khách".
// Địa chỉ / locale / tuỳ chọn email đọc LÚC NÀY (không dùng bản chụp). Trả lý do chặn an toàn — không nội dung khách.
import { can, channelsFor, isPermissionKey, type NotifyKind } from '@appchat/shared';
import type { PlatformDb, TenantDb } from '@appchat/db';
import type { AuthzResolver } from '../../authz/services/authz-resolver';
import type { NotifyPrefsService } from '../services/prefs.service';
import type { SuppressCode } from './types';

export interface GuardDeps {
  platform: Pick<PlatformDb, 'workspace' | 'membership' | 'user'>;
  authz: Pick<AuthzResolver, 'resolve'>;
  prefs: Pick<NotifyPrefsService, 'load'>;
}

export type Allowed = { ok: true; userId: string; email: string; locale: string; workspace: string } | { ok: false; code: SuppressCode };

export async function currentRecipient(d: GuardDeps, db: Pick<TenantDb, 'outboxEvent'>, ws: string, i: { userId: string | null; kind: string; policy: string | null; sourceEventId: string }): Promise<Allowed> {
  const w = await d.platform.workspace.findUnique({ where: { id: ws }, select: { ownerUserId: true, name: true, dbStatus: true } });
  if (!w || w.dbStatus !== 'active') return { ok: false, code: 'workspace_gone' };
  const userId = i.policy === 'owner' ? w.ownerUserId : i.userId;
  if (!userId) return { ok: false, code: 'owner_changed' };
  const src = await db.outboxEvent.findUnique({ where: { id: i.sourceEventId }, select: { payload: true } });
  if (!src || (src.payload as { privacy_erased?: unknown }).privacy_erased === true) return { ok: false, code: 'source_gone' };
  const m = await d.platform.membership.findUnique({ where: { workspaceId_userId: { workspaceId: ws, userId } }, select: { status: true, roleKey: true, delegations: true } });
  if (!m || m.status !== 'active') return { ok: false, code: 'not_member' };
  if (i.policy && i.policy !== 'owner' && i.policy !== 'list' && isPermissionKey(i.policy) && !can(await d.authz.resolve(ws, userId, m), i.policy)) return { ok: false, code: 'no_permission' };
  const prefs = await d.prefs.load(userId);
  if (!channelsFor(prefs, i.kind as NotifyKind).email) return { ok: false, code: 'email_off' };
  const u = await d.platform.user.findUnique({ where: { id: userId }, select: { email: true, locale: true } });
  if (!u?.email) return { ok: false, code: 'no_address' };
  return { ok: true, userId, email: u.email, locale: u.locale, workspace: w.name };
}
