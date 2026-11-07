// Điều kiện SQL scope bản ghi cho list / count / search (TIP-042c) — CÙNG bảng chân trị với `decide` (record-policy.ts):
// none → FALSE trước mọi nhánh; own → owner / assignee / mine / quan hệ khách đủ chế độ; team → thêm `team_id = ANY(nhóm của mình)`
// (DC-299 — không OR với owner ∈ thành viên nhóm). Cột do domain định nghĩa sẵn (allowlist hằng trong code), không nhận identifier từ
// caller HTTP. Quan hệ khách là EXISTS trên `contact_collaborator (user_id, contact_id) INCLUDE (role)` — lọc id trước LIMIT / payload.
import { TenantSql as Prisma } from '@appchat/db';
import type { AuthzContext } from '@appchat/shared';
import { levelOf, type AccessMode } from './access-mode';
import { grantSql } from './contact-grants';
import type { ModulePolicy } from './record-policy';

export interface ScopeColumns {
  owner?: Prisma.Sql;
  assignee?: Prisma.Sql;
  team?: Prisma.Sql;
  /** Cột team kiểu text (ticket — TIP-034 lưu text); mặc định uuid. Cast ở phía tham số để giữ index trên cột. */
  teamText?: boolean;
  contact?: Prisma.Sql;
  /** Điều kiện own riêng của module (ticket: người tạo; hội thoại: phụ trách khách) — nhận id người xem. */
  mine?: (me: string) => Prisma.Sql;
}

const col = (c: string) => Prisma.raw(c);

/** Cột chuẩn theo alias bảng (`owner_user_id`, `team_id`, `contact_id`) — alias là hằng của repo. */
export const docColumns = (alias: string): ScopeColumns => ({
  owner: col(`${alias}.owner_user_id`),
  team: col(`${alias}.team_id`),
  contact: col(`${alias}.contact_id`),
});

export function recordScopeSql(authz: AuthzContext, p: ModulePolicy, mode: AccessMode, c: ScopeColumns): Prisma.Sql {
  const level = levelOf(authz, p.module, mode);
  if (level === 'all') return Prisma.sql`TRUE`;
  if (level === 'none') return Prisma.sql`FALSE`;
  const me = authz.userId;
  const or: Prisma.Sql[] = [];
  if (c.owner) or.push(Prisma.sql`${c.owner} = ${me}::uuid`);
  if (c.assignee) or.push(Prisma.sql`${c.assignee} = ${me}::uuid`);
  if (c.mine) or.push(c.mine(me));
  if (level === 'team' && c.team && authz.teamIds.length) or.push(c.teamText ? Prisma.sql`${c.team} = ANY(${authz.teamIds}::text[])` : Prisma.sql`${c.team} = ANY(${authz.teamIds}::uuid[])`);
  if (p.contactGrants && c.contact) or.push(grantSql(me, c.contact, mode));
  return or.length ? Prisma.sql`(${Prisma.join(or, ' OR ')})` : Prisma.sql`FALSE`;
}
