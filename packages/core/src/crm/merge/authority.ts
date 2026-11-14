// Quyền gộp khách (TIP-015e §2.3–§2.5): mọi khách gốc phải ghi được theo scope hiện tại, VÀ cùng người phụ trách + đúng tập ACL tường minh
// (user_id, role) trên cả họ khách — kiểm SAU khi khoá gốc theo thứ tự. Lệch → 409 chung `merge: acl_mismatch` (không lộ ai có quyền gì);
// người dùng tự chia sẻ / chuyển phụ trách bằng action đã có rồi xem trước lại. Gộp KHÔNG bao giờ hợp quyền, thêm collaborator hay nâng
// watcher. Dấu ACL đưa vào biên nhận để hoàn tác phát hiện ACL đổi sau gộp.
import { createHash } from 'node:crypto';
import { AppError, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { editableContact } from '../services/access';

/** Thông điệp cho Trợ lý / người gọi API (chi tiết ai có quyền gì không lộ). */
const ACL_MSG = 'Cannot merge: customers have different owners or different sharing (collaborators/watchers). Merge never adds access. Ask the user to transfer owner or share so both match, then preview again.';

type Root = { id: string; ownerUserId: string | null; deletedAt: Date | null; mergedIntoId: string | null; version: number };

/** Dấu chủ + ACL (user, role) của một họ khách — thứ tự ổn định. */
export async function aclFingerprint(tx: TenantTx, familyIds: string[], owner: string | null): Promise<string> {
  const rows = await tx.contactCollaborator.findMany({ where: { contactId: { in: familyIds } }, select: { userId: true, role: true } });
  const set = [...new Set(rows.map((r) => `${r.userId}:${r.role}`))].sort();
  return createHash('sha256').update(`${owner ?? '-'}|${set.join(',')}`).digest('base64url').slice(0, 22);
}

/**
 * Kiểm một đơn vị gộp sau khoá: gốc sống, ghi được (scope ghi hiện tại), phiên bản khớp nếu người gọi gửi, cùng chủ + cùng ACL. Trả dấu ACL.
 * `families`: id họ của bản chính + từng bản phụ (đã khoá).
 */
export async function assertMergeable(
  tx: TenantTx,
  authz: AuthzContext,
  primary: Root,
  sources: Root[],
  families: Map<string, string[]>,
  expected?: Record<string, number>,
): Promise<string> {
  for (const c of [primary, ...sources]) {
    if (c.deletedAt || c.mergedIntoId) throw new AppError('INVALID_STATE', 409, { contact_id: 'not_live' }, 'Customer was already merged into another record or deleted — nothing to merge.');
    await editableContact(tx, authz, c.id);
    const want = expected?.[c.id];
    if (want !== undefined && want !== c.version) throw new AppError('STALE_VERSION', 409, { [c.id]: 'stale' });
  }
  const fp = await aclFingerprint(tx, families.get(primary.id) ?? [primary.id], primary.ownerUserId);
  for (const s of sources) {
    if (s.ownerUserId !== primary.ownerUserId) throw new AppError('CONFLICT', 409, { merge: 'acl_mismatch' }, ACL_MSG);
    if ((await aclFingerprint(tx, families.get(s.id) ?? [s.id], s.ownerUserId)) !== fp) throw new AppError('CONFLICT', 409, { merge: 'acl_mismatch' }, ACL_MSG);
  }
  return fp;
}
