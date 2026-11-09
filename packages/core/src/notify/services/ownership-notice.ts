// Thông báo chuyển phụ trách khách (TIP-015d §5): dòng `notification` gốc chỉ có tiêu đề chung + link null; `contact_transfer_notice`
// ràng id thông báo với lần chuyển + người nhận + chiều (`from` người cũ / `to` người mới). Tên khách / người nhận / link Hồ sơ 360° chỉ
// chiếu LÚC ĐỌC theo quyền HIỆN TẠI của người nhận (chuông, WS, email ngay trước khi gửi) — không bao giờ ghi ngược vào tiêu đề gốc.
// Người nhận không còn thấy khách (mất scope / mất crm.view) → giữ chữ chung "phân công đã thay đổi", không tên / id / link.
// Người nhận không còn là thành viên → bỏ (không hiện, không gửi). Đọc theo lô (không N+1): bindings → transfers → khách → tên.
import { can, type AuthzContext } from '@appchat/shared';
import { TenantSql as Prisma, type PlatformDb, type TenantDb } from '@appchat/db';
import type { AuthzResolver } from '../../authz/services/authz-resolver';
import { POLICIES, recordScopeSql } from '../../authz/data-access';
import { notificationTitle } from '../mail';

export type NoticeDirection = 'from' | 'to';
export interface NoticeRow {
  id: string;
  type: string;
  title: string;
  link: string | null;
}
/** Kết quả chiếu: `null` = bỏ dòng (người nhận không còn là thành viên). */
export type Projected = { title: string; link: string | null; params: Record<string, string> } | null;

const COLS = { owner: Prisma.raw('c.owner_user_id'), team: Prisma.raw('c.team_id'), contact: Prisma.raw('c.id') };
const cut = (s: string) => s.slice(0, 200);

/** Tiêu đề chung lưu ở dòng gốc (không PII). */
export const genericNoticeTitle = (locale: string) => notificationTitle('crm_owner', locale, { variant: 'generic' });

/** Quyền hiện tại của một người nhận (null = không còn là thành viên active). */
export async function currentAuthz(platform: Pick<PlatformDb, 'membership'>, authz: Pick<AuthzResolver, 'resolve'>, workspaceId: string, userId: string): Promise<AuthzContext | null> {
  const m = await platform.membership.findUnique({ where: { workspaceId_userId: { workspaceId, userId } }, select: { roleKey: true, delegations: true, status: true } });
  return m && m.status === 'active' ? authz.resolve(workspaceId, userId, m) : null;
}

/**
 * Chiếu các dòng thông báo của MỘT người nhận (`viewer` = quyền hiện tại, null = đã bị gỡ). Dòng không có binding giữ nguyên.
 * Trả map id → bản chiếu; id vắng trong map = không phải thông báo chuyển phụ trách.
 */
export async function projectNotices(
  db: Pick<TenantDb, 'contactTransferNotice' | 'contactTransfer' | '$queryRaw'>,
  platform: Pick<PlatformDb, 'user'>,
  viewer: AuthzContext | null,
  rows: readonly NoticeRow[],
  locale: string,
): Promise<Map<string, Projected>> {
  const out = new Map<string, Projected>();
  const ids = rows.filter((r) => r.type === 'crm_owner').map((r) => r.id);
  if (!ids.length) return out;
  const binds = await db.contactTransferNotice.findMany({ where: { notificationId: { in: ids } } });
  if (!binds.length) return out;
  if (!viewer) {
    for (const b of binds) out.set(b.notificationId, null);
    return out;
  }
  const transfers = new Map(
    (await db.contactTransfer.findMany({ where: { id: { in: [...new Set(binds.map((b) => b.transferId))] } }, select: { id: true, contactId: true, toUserId: true, actorId: true } })).map((t) => [t.id, t]),
  );
  const contactIds = [...new Set([...transfers.values()].map((t) => t.contactId))];
  // Khách người nhận còn thấy (scope đọc crm hiện tại + crm.view) — một truy vấn cho cả trang.
  const visible = can(viewer, 'crm.view') && contactIds.length
    ? new Map(
        (await db.$queryRaw<{ id: string; name: string }[]>`
          SELECT c.id, c.name FROM contact c WHERE c.id = ANY(${contactIds}::uuid[]) AND c.deleted_at IS NULL AND ${recordScopeSql(viewer, POLICIES.crm, 'read', COLS)}`).map((c) => [c.id, c.name]),
      )
    : new Map<string, string>();
  const people = [...new Set([...transfers.values()].flatMap((t) => (visible.has(t.contactId) ? [t.toUserId, t.actorId] : [])).filter((x): x is string => !!x))];
  const names = new Map(people.length ? (await platform.user.findMany({ where: { id: { in: people } }, select: { id: true, name: true, email: true } })).map((u) => [u.id, u.name || u.email]) : []);
  const generic = genericNoticeTitle(locale);
  for (const b of binds) {
    const t = transfers.get(b.transferId);
    const contact = t ? visible.get(t.contactId) : undefined;
    if (!t || contact === undefined) {
      out.set(b.notificationId, { title: generic, link: null, params: { variant: 'generic' } });
      continue;
    }
    const params = { variant: b.direction, actor: cut((t.actorId && names.get(t.actorId)) || ''), contact: cut(contact), to: cut(names.get(t.toUserId) ?? '') };
    out.set(b.notificationId, { title: notificationTitle('crm_owner', locale, params), link: `/customers?c=${t.contactId}`, params });
  }
  return out;
}

/** Áp bản chiếu lên dòng: bỏ dòng `null`, thay tiêu đề / link của dòng có binding. */
export function applyProjection<R extends NoticeRow>(rows: readonly R[], p: Map<string, Projected>): R[] {
  const out: R[] = [];
  for (const r of rows) {
    if (!p.has(r.id)) out.push(r);
    else {
      const v = p.get(r.id);
      if (v) out.push({ ...r, title: v.title, link: v.link });
    }
  }
  return out;
}
