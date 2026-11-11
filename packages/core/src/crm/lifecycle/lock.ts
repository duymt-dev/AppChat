// Họ khách + khoá gốc (TIP-015f §2.4): khách gốc + mọi nguồn đã gộp vào (merged_into, đệ quy, phát hiện vòng, tối đa 32 bước — đồ thị
// lỗi → 503 fail closed, không cắt bớt). Khoá MỌI khách trong họ theo id tăng dần (thứ tự toàn cục: khách → báo giá → hợp đồng → đơn →
// đề nghị → khoản thu → sổ con), đọc lại họ SAU khoá; họ đổi giữa chừng → thử lại có giới hạn rồi 409. Chỉ thao tác trên khách gốc còn sống.
import { AppError } from '@appchat/shared';
import { TenantSql as Prisma } from '@appchat/db';
import type { TenantTx } from '../../kernel/actions/action-context';
import { UUID } from '../services/access';
import { bindStageFamily, type StageFamilyBinding } from '../stage/types';
import { contactState } from './identity-state';

const MAX_HOPS = 32;
const RETRIES = 3;

type ContactRow = NonNullable<Awaited<ReturnType<TenantTx['contact']['findUnique']>>>;
export interface Family {
  root: ContactRow;
  /** Gốc + mọi nguồn đã gộp (id tăng dần). */
  ids: string[];
}

/** Nguồn đã gộp vào `rootId` (BFS theo merged_into, có giới hạn bước + phát hiện vòng). */
export async function familyIds(tx: Pick<TenantTx, '$queryRaw'>, rootId: string): Promise<string[]> {
  const rows = await tx.$queryRaw<{ id: string; depth: number; cyc: boolean }[]>`
    WITH RECURSIVE fam(id, depth, path, cyc) AS (
      SELECT ${rootId}::uuid, 0, ARRAY[${rootId}::uuid], false
      UNION ALL
      SELECT c.id, f.depth + 1, f.path || c.id, c.id = ANY(f.path)
      FROM contact c JOIN fam f ON c.merged_into_id = f.id
      WHERE NOT f.cyc AND f.depth <= ${MAX_HOPS}
    )
    SELECT id, depth, cyc FROM fam`;
  if (rows.some((r) => r.cyc || r.depth > MAX_HOPS)) throw new AppError('WORKSPACE_UNAVAILABLE', 503, { contact_id: 'family_invalid' });
  return [...new Set(rows.map((r) => r.id))].sort();
}

/** Khoá họ khách (id tăng dần) + đọc lại; trả gốc đọc SAU khoá. Không thấy / là nguồn đã gộp → 404. */
export async function lockFamily(tx: TenantTx, rootId: string): Promise<Family> {
  if (!UUID.test(rootId)) throw new AppError('NOT_FOUND', 404, { contact_id: 'not_found' });
  for (let i = 0; i < RETRIES; i++) {
    const ids = await familyIds(tx, rootId);
    await tx.$queryRaw`SELECT id FROM contact WHERE id = ANY(${ids}::uuid[]) ORDER BY id FOR UPDATE`;
    const again = await familyIds(tx, rootId);
    if (again.length !== ids.length || again.some((id, k) => id !== ids[k])) continue;
    const root = await tx.contact.findUnique({ where: { id: rootId } });
    if (!root || root.mergedIntoId) throw new AppError('NOT_FOUND', 404, { contact_id: 'not_found' });
    return { root, ids };
  }
  throw new AppError('CONFLICT', 409, { contact_id: 'family_changed' });
}

const CHILD = { quote: Prisma.raw('quote'), contract: Prisma.raw('contract'), order: Prisma.raw('"order"') } as const;
export type StageChild = keyof typeof CHILD;

/** Gốc chuẩn của `contactId` (đi theo merged_into): sống → id; gốc đã xoá / chuỗi hỏng → null. */
async function canonicalOf(tx: TenantTx, contactId: string): Promise<{ root: string | null; anchor: string }> {
  const s = await contactState(tx, contactId);
  return s.kind === 'active' ? { root: s.contactId, anchor: s.contactId } : { root: null, anchor: s.kind === 'soft_deleted' ? s.contactId : contactId };
}

/**
 * TIP-015g §1.2: khoá họ khách CHUẨN của `contactId` (gốc sống + nguồn đã gộp, id tăng dần) rồi đọc lại; ghi ràng buộc cho
 * `applyStageRule` của transaction này. Gọi TRƯỚC khi khoá chứng từ. Họ đổi giữa chừng → thử lại có giới hạn rồi 409.
 */
export async function lockStageFamily(tx: TenantTx, contactId: string): Promise<StageFamilyBinding> {
  for (let i = 0; i < RETRIES; i++) {
    const c = await canonicalOf(tx, contactId);
    const ids = [...new Set([...(await familyIds(tx, c.anchor).catch(() => [c.anchor])), contactId])].sort();
    await tx.$queryRaw`SELECT id FROM contact WHERE id = ANY(${ids}::uuid[]) ORDER BY id FOR UPDATE`;
    const again = await canonicalOf(tx, contactId);
    if (again.root !== c.root || again.anchor !== c.anchor) continue;
    return bindStageFamily(tx, { rootId: c.root, ids });
  }
  throw new AppError('CONFLICT', 409, { contact_id: 'family_changed' });
}

/** Như `lockStageFamily` theo khách của chứng từ con (đọc contact_id → khoá họ → đọc lại; đổi khách → thử lại). Không thấy → null. */
export async function lockStageFamilyOf(tx: TenantTx, child: StageChild, id: string): Promise<StageFamilyBinding | null> {
  if (!UUID.test(id)) return null;
  const cid = async () => (await tx.$queryRaw<{ contact_id: string | null }[]>`SELECT contact_id FROM ${CHILD[child]} WHERE id = ${id}::uuid`)[0]?.contact_id ?? null;
  for (let i = 0; i < RETRIES; i++) {
    const before = await cid();
    if (!before) return null;
    const b = await lockStageFamily(tx, before);
    if ((await cid()) === before) return b;
  }
  throw new AppError('CONFLICT', 409, { contact_id: 'changed' });
}
