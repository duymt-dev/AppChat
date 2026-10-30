// Data scope (rbac-permissions §5, D32): repo BẮT BUỘC áp `scopeFilter` vào mọi list / get; handler ghi kiểm `assertInScope`.
// own  → owner = me HOẶC assignee = me HOẶC khách mình là collaborator / watcher (contactIds — TIP-015 cấp)
// team → owner ∈ thành viên các nhóm của mình (teamUserIds) ∪ {me}
// all  → không lọc · none → không khớp bản ghi nào
import { AppError, type AuthzContext, type ScopeModule } from '@appchat/shared';

export interface ScopeFields {
  /** Cột người phụ trách (Prisma field), vd. `ownerUserId`. */
  owner: string;
  /** Cột người được gán (nếu có), vd. `assigneeUserId`. */
  assignee?: string;
  /** Cột khách hàng (nếu có) + danh sách khách mình là collaborator / watcher (D32). */
  contact?: { field: string; ids: readonly string[] };
}

type Where = Record<string, unknown>;
/** Điều kiện không khớp gì (id null không tồn tại) — dùng cho scope `none`. */
const NOTHING: Where = { AND: [{ id: { in: [] } }] };

export function scopeFilter(authz: AuthzContext, module: ScopeModule, f: ScopeFields): Where {
  const level = authz.isOwner ? 'all' : authz.scope[module];
  if (level === 'all') return {};
  if (level === 'none') return NOTHING;
  const me = authz.userId;
  const or: Where[] = [];
  if (level === 'team') or.push({ [f.owner]: { in: [...new Set([me, ...(authz.teamUserIds ?? [])])] } });
  else or.push({ [f.owner]: me });
  if (f.assignee) or.push({ [f.assignee]: me });
  if (f.contact?.ids.length) or.push({ [f.contact.field]: { in: [...f.contact.ids] } });
  return or.length === 1 ? or[0]! : { OR: or };
}

/** Kiểm một bản ghi đã đọc (handler ghi / get theo id) — ngoài scope → SCOPE_FORBIDDEN 403. */
export function inScope(authz: AuthzContext, module: ScopeModule, row: Record<string, unknown>, f: ScopeFields): boolean {
  const level = authz.isOwner ? 'all' : authz.scope[module];
  if (level === 'all') return true;
  if (level === 'none') return false;
  const me = authz.userId;
  const owner = row[f.owner];
  if (level === 'team' ? owner === me || (authz.teamUserIds ?? []).includes(owner as string) : owner === me) return true;
  if (f.assignee && row[f.assignee] === me) return true;
  return !!f.contact && f.contact.ids.includes(row[f.contact.field] as string);
}

export function assertInScope(authz: AuthzContext, module: ScopeModule, row: Record<string, unknown>, f: ScopeFields): void {
  if (!inScope(authz, module, row, f)) throw new AppError('SCOPE_FORBIDDEN', 403, { scope: module });
}
