// Đọc / kiểm thư mục KB (TIP-020b): tên trùng toàn kho (cùng biểu thức với unique index `kb_folder_name_key` — f_unaccent(lower(btrim))),
// cây cha – con không vòng (đi ngược tổ tiên từ cha mới, ≤ 64 bậc), đếm phụ thuộc khi xoá (nguồn kể cả thùng rác + thư mục con).
import { AppError } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_DEPTH = 64;

export async function liveFolder(tx: TenantTx, id: string) {
  const f = UUID.test(id) ? await tx.kbFolder.findUnique({ where: { id } }) : null;
  if (!f) throw new AppError('NOT_FOUND', 404, { folder_id: 'not_found' });
  return f;
}

/** Khoá dòng thư mục (sửa / xoá / đổi cha đồng thời xếp hàng) rồi kiểm version. */
export async function lockFolder(tx: TenantTx, id: string, ifVersion?: number) {
  if (!UUID.test(id)) throw new AppError('NOT_FOUND', 404, { folder_id: 'not_found' });
  await tx.$queryRaw`SELECT 1 FROM kb_folder WHERE id = ${id}::uuid FOR UPDATE`;
  const f = await liveFolder(tx, id);
  if (ifVersion !== undefined && ifVersion !== f.version) throw new AppError('STALE_VERSION', 409, { version: String(f.version) });
  return f;
}

/** Tên đã có ở thư mục khác (bỏ qua chính nó). Index unique là chốt cuối khi hai lệnh cùng lúc. */
export async function nameTaken(tx: TenantTx, name: string, exceptId?: string): Promise<boolean> {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM kb_folder WHERE f_unaccent(lower(btrim(name))) = f_unaccent(lower(btrim(${name}))) LIMIT 2`;
  return rows.some((r) => r.id !== exceptId);
}

export async function assertNameFree(tx: TenantTx, name: string, exceptId?: string) {
  if (await nameTaken(tx, name, exceptId)) throw new AppError('CONFLICT', 409, { name: 'duplicate' });
}

/** Cha mới hợp lệ: tồn tại, khác chính nó, không phải con cháu của nó (đi ngược từ cha mới lên gốc). */
export async function assertParent(tx: TenantTx, parentId: string | null, selfId?: string) {
  if (!parentId) return;
  if (parentId === selfId) throw new AppError('VALIDATION_FAILED', 422, { parent_id: 'self' });
  let cur: string | null = (await liveFolder(tx, parentId).catch(() => {
    throw new AppError('NOT_FOUND', 404, { parent_id: 'not_found' });
  })).id;
  for (let i = 0; cur && i < MAX_DEPTH; i++) {
    if (cur === selfId) throw new AppError('VALIDATION_FAILED', 422, { parent_id: 'cycle' });
    const up: { parentId: string | null } | null = await tx.kbFolder.findUnique({ where: { id: cur }, select: { parentId: true } });
    cur = up?.parentId ?? null;
  }
  if (cur) throw new AppError('VALIDATION_FAILED', 422, { parent_id: 'too_deep' });
}

/** Phụ thuộc chặn xoá: nguồn (kể cả thùng rác) + thư mục con. */
export async function dependents(tx: TenantTx, id: string): Promise<{ sources: number; trashed: number; children: number }> {
  const [sources, trashed, children] = await Promise.all([
    tx.kbSource.count({ where: { folderId: id, deletedAt: null } }),
    tx.kbSource.count({ where: { folderId: id, deletedAt: { not: null } } }),
    tx.kbFolder.count({ where: { parentId: id } }),
  ]);
  return { sources, trashed, children };
}

/** Lỗi unique index (P2002 / 23505 trên `kb_folder_name_key`) → 409 duplicate như kiểm trước. */
export function duplicateFromDb(e: unknown): never {
  const msg = String((e as { message?: string })?.message ?? '');
  const code = (e as { code?: string })?.code;
  if (code === 'P2002' || msg.includes('kb_folder_name_key') || msg.includes('23505')) throw new AppError('CONFLICT', 409, { name: 'duplicate' });
  throw e;
}
