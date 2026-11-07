// Phiên bản lạc quan của khách (TIP-025b §D.4) — nền dùng chung (026b dùng lại, không thêm bộ đếm thứ hai). Version do trigger
// `contact_bump_version` tăng ở MỌI UPDATE; ở đây chỉ so khớp: khoá dòng, kiểm `if_version` (thiếu → bản vừa khoá), UPDATE theo
// id + version và đòi đúng một dòng. Undo chỉ khôi phục trường lần sửa đó đã đổi, và chỉ khi khách vẫn ở đúng version sau-ghi.
import { AppError } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';

/** Khoá dòng khách rồi đối chiếu version người dùng đã thấy — lệch → 409 STALE_VERSION (kèm version hiện tại). */
export async function lockContactVersion(tx: TenantTx, id: string, ifVersion?: number): Promise<number> {
  const rows = await tx.$queryRaw<{ version: number }[]>`SELECT version FROM contact WHERE id = ${id}::uuid AND deleted_at IS NULL FOR UPDATE`;
  const v = rows[0]?.version;
  if (v === undefined) throw new AppError('NOT_FOUND', 404, { contact_id: 'not_found' });
  if (ifVersion !== undefined && ifVersion !== v) throw new AppError('STALE_VERSION', 409, { version: String(v) });
  return v;
}

/** UPDATE theo id + version đã khoá; trả version mới (trigger tăng). Không đúng một dòng → 409 (đua ngoài khoá). */
export async function updateAtVersion(tx: TenantTx, id: string, version: number, data: Record<string, unknown>): Promise<number> {
  const n = await tx.contact.updateMany({ where: { id, version, deletedAt: null }, data });
  if (n.count !== 1) throw new AppError('STALE_VERSION', 409, { version: 'changed' });
  const after = await tx.contact.findUniqueOrThrow({ where: { id }, select: { version: true } });
  return after.version;
}

/** Trường lần sửa thực sự đổi (so trước / sau theo giá trị JSON) — chỉ những trường này được ghi log + khôi phục khi undo. */
export function changedFields(before: Record<string, unknown>, data: Record<string, unknown>): string[] {
  return Object.keys(data).filter((k) => k !== 'updatedAt' && JSON.stringify(before[k] ?? null) !== JSON.stringify(data[k] ?? null));
}
