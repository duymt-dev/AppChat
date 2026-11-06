// Policy truy cập MỘT bản ghi (TIP-042c, DC-299, D32) — cùng bảng chân trị với `recordScopeSql` (list / count / search):
//   Owner workspace / scope all → được · scope none → KHÔNG (chặn trước mọi nhánh owner / assignee / quan hệ / nhóm)
//   own  → owner = me · assignee = me · `mine` (người tạo ticket / phụ trách khách của hội thoại) · quan hệ khách đủ chế độ
//   team → như own + `team_id` bản ghi ∈ nhóm của mình (không suy từ owner ∈ thành viên nhóm — DC-299); team_id null → chỉ nhánh own
// Quan hệ khách (contact grant) chỉ áp module có `contactGrants` (CRM / hội thoại / chứng từ / lịch hẹn; ticket KHÔNG — rbac §5 giữ
// assignee / người tạo). Ghi: watcher không bao giờ là bằng chứng (grantAllows). Lỗi: không đọc được → 404 (không lộ tồn tại), đọc được
// mà không ghi được → 403 SCOPE_FORBIDDEN.
import { AppError, type AuthzContext, type ScopeModule } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { levelOf, type AccessMode } from './access-mode';
import { grantAllows, grantOf, type ContactGrant } from './contact-grants';

export interface RecordRef {
  owner?: string | null;
  assignee?: string | null;
  team?: string | null;
  contact?: string | null;
  /** Điều kiện own riêng của module đã tính sẵn (ticket: người tạo là me; hội thoại: phụ trách khách là me). */
  mine?: boolean;
}

export interface ModulePolicy {
  module: ScopeModule;
  contactGrants: boolean;
}

export const POLICIES = {
  crm: { module: 'crm', contactGrants: true },
  inbox: { module: 'inbox', contactGrants: true },
  sales: { module: 'sales', contactGrants: true },
  booking: { module: 'booking', contactGrants: true },
  support: { module: 'support', contactGrants: false },
} as const satisfies Record<string, ModulePolicy>;

/**
 * Quyết định không cần DB: true / false, hoặc `grant` = chỉ còn quan hệ khách có thể cho phép (gọi lại với `grant` đã nạp).
 * `grant` truyền vào (kể cả null) → luôn trả boolean.
 */
export function decide(authz: AuthzContext, p: ModulePolicy, mode: AccessMode, ref: RecordRef, grant?: ContactGrant | null): boolean | 'grant' {
  const level = levelOf(authz, p.module, mode);
  if (level === 'all') return true;
  if (level === 'none') return false;
  const me = authz.userId;
  if (ref.mine || (ref.owner && ref.owner === me) || (ref.assignee && ref.assignee === me)) return true;
  if (level === 'team' && ref.team && authz.teamIds.includes(ref.team)) return true;
  if (!p.contactGrants || !ref.contact) return false;
  return grant === undefined ? 'grant' : grantAllows(grant, mode);
}

/** Quyết định đầy đủ (nạp quan hệ khách khi cần — một truy vấn khoá chính). */
export async function allows(tx: Pick<TenantTx, 'contactCollaborator'>, authz: AuthzContext, p: ModulePolicy, mode: AccessMode, ref: RecordRef): Promise<boolean> {
  const d = decide(authz, p, mode, ref);
  return d === 'grant' ? grantAllows(await grantOf(tx, ref.contact, authz.userId), mode) : d;
}

/**
 * Guard một bản ghi đã nạp: không đọc được → 404 `notFound`; `mode = write` mà đọc được nhưng không ghi được → 403 SCOPE_FORBIDDEN.
 * Ghi luôn kiểm đọc trước (không trả 403 cho bản ghi người gọi không được biết là tồn tại).
 */
export async function guardRecord(
  tx: Pick<TenantTx, 'contactCollaborator'>,
  authz: AuthzContext,
  p: ModulePolicy,
  mode: AccessMode,
  ref: RecordRef,
  notFound: Record<string, string>,
): Promise<void> {
  const d = decide(authz, p, 'read', ref);
  const grant = d === 'grant' || (mode === 'write' && p.contactGrants && ref.contact) ? await grantOf(tx, ref.contact, authz.userId) : undefined;
  if (!(d === 'grant' ? grantAllows(grant, 'read') : d)) throw new AppError('NOT_FOUND', 404, notFound);
  if (mode === 'write' && decide(authz, p, 'write', ref, grant ?? null) !== true) throw new AppError('SCOPE_FORBIDDEN', 403, { scope: p.module });
}
