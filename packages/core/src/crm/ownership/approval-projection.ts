// Duyệt chuyển phụ trách theo quyền khách HIỆN TẠI (TIP-015d §1.3): yêu cầu duyệt `contact.transfer_owner` chỉ hiện với người có
// crm.reassign + thấy được khách (scope đọc crm) — vắng khỏi danh sách / đếm / Hộp thư, đọc trực tiếp 404, không lộ tên / ghi chú khách.
// Quyết được khi còn scope GHI khách. Input lưu được trích có kiểm kiểu (UUID) — input cũ hỏng → FALSE (đóng khi lỗi). Input sửa (đổi khách /
// người nhận) kiểm lại scope ghi + người nhận là thành viên trước khi lưu.
import { TenantSql as Prisma } from '@appchat/db';
import { AppError, can, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import type { ApprovalDomainHook } from '../../ai/approvals/domain-authorization';
import { POLICIES, recordScopeSql } from '../../authz/data-access';
import { editableContact } from '../services/access';

const UUID_RE = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
const COLS = { owner: Prisma.raw('c.owner_user_id'), team: Prisma.raw('c.team_id'), contact: Prisma.raw('c.id') };

/** EXISTS khách của input (UUID hợp lệ, chưa xoá) trong scope `mode` của người xem. */
function contactPredicate(authz: AuthzContext, mode: 'read' | 'write'): Prisma.Sql {
  if (!can(authz, 'crm.reassign')) return Prisma.sql`FALSE`;
  // CASE bảo đảm chỉ ép kiểu khi đã đúng dạng UUID (AND không có thứ tự đánh giá cố định) — input hỏng → NULL → không khớp.
  const id = Prisma.sql`CASE WHEN jsonb_typeof(ar.input) = 'object' AND jsonb_typeof(ar.input->'contact_id') = 'string' AND (ar.input->>'contact_id') ~ ${UUID_RE} THEN (ar.input->>'contact_id')::uuid END`;
  return Prisma.sql`EXISTS (SELECT 1 FROM contact c WHERE c.id = ${id} AND c.deleted_at IS NULL AND ${recordScopeSql(authz, POLICIES.crm, mode, COLS)})`;
}

export function transferApprovalHook(members: { assertMember(ws: string, userId: string, field: string): Promise<unknown> }): ApprovalDomainHook {
  return {
    owner: 'crm',
    visible: (authz) => contactPredicate(authz, 'read'),
    decidable: (authz) => contactPredicate(authz, 'write'),
    async checkInput(tx: TenantTx, who: { workspaceId: string; authz: AuthzContext }, input: Record<string, unknown>) {
      if (!can(who.authz, 'crm.reassign')) throw new AppError('FORBIDDEN', 403, { permission: 'crm.reassign' });
      await editableContact(tx, who.authz, String(input.contact_id ?? ''));
      await members.assertMember(who.workspaceId, String(input.to_user_id ?? ''), 'to_user_id');
    },
  };
}

/**
 * Bản hàng loạt: thấy / quyết được khi MỌI khách trong `contact_ids` còn trong scope tương ứng (một khách ngoài scope → ẩn cả yêu cầu —
 * không lộ tên / số khách khác). `contact_ids` không phải mảng chuỗi UUID → FALSE.
 */
function bulkPredicate(authz: AuthzContext, mode: 'read' | 'write'): Prisma.Sql {
  if (!can(authz, 'crm.reassign')) return Prisma.sql`FALSE`;
  const arr = Prisma.sql`CASE WHEN jsonb_typeof(ar.input) = 'object' AND jsonb_typeof(ar.input->'contact_ids') = 'array' THEN ar.input->'contact_ids' ELSE '[]'::jsonb END`;
  const bad = Prisma.sql`EXISTS (SELECT 1 FROM jsonb_array_elements(${arr}) e(v) WHERE jsonb_typeof(e.v) <> 'string' OR NOT ((e.v #>> '{}') ~ ${UUID_RE}))`;
  const id = Prisma.sql`CASE WHEN (x.v #>> '{}') ~ ${UUID_RE} THEN (x.v #>> '{}')::uuid END`;
  const missing = Prisma.sql`EXISTS (SELECT 1 FROM jsonb_array_elements(${arr}) x(v) WHERE NOT EXISTS (SELECT 1 FROM contact c WHERE c.id = ${id} AND c.deleted_at IS NULL AND ${recordScopeSql(authz, POLICIES.crm, mode, COLS)}))`;
  return Prisma.sql`(jsonb_array_length(${arr}) > 0 AND NOT ${bad} AND NOT ${missing})`;
}

export function transferBulkApprovalHook(members: { assertMember(ws: string, userId: string, field: string): Promise<unknown> }): ApprovalDomainHook {
  return {
    owner: 'crm',
    visible: (authz) => bulkPredicate(authz, 'read'),
    decidable: (authz) => bulkPredicate(authz, 'write'),
    async checkInput(tx: TenantTx, who: { workspaceId: string; authz: AuthzContext }, input: Record<string, unknown>) {
      if (!can(who.authz, 'crm.reassign')) throw new AppError('FORBIDDEN', 403, { permission: 'crm.reassign' });
      const ids = Array.isArray(input.contact_ids) ? input.contact_ids : [];
      if (!ids.length) throw new AppError('VALIDATION_FAILED', 422, { contact_ids: 'required' });
      for (const id of new Set(ids.map(String))) await editableContact(tx, who.authz, id);
      await members.assertMember(who.workspaceId, String(input.to_user_id ?? ''), 'to_user_id');
    },
  };
}
