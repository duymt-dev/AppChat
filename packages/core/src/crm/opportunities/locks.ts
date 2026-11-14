// Khoá cơ hội (TIP-026c §3.1, concurrency §2): thứ tự toàn cục họ khách → chứng từ → CƠ HỘI. Producer chứng từ đã khoá họ khách
// (`lockStageFamily*`) và chứng từ của mình rồi mới gọi `lockOpportunity`; nhiều cơ hội trong một transaction khoá theo id tăng dần.
// Action cơ hội tự khoá họ khách của cơ hội trước (`lockOpportunityFamily`) — đọc contact_id → khoá họ → khoá cơ hội → đọc lại.
import { AppError, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { lockStageFamily } from '../lifecycle/lock';
import { editableContact, UUID } from '../services/access';
import type { StageFamilyBinding } from '../stage/types';

export type OpportunityRecord = NonNullable<Awaited<ReturnType<TenantTx['contactOpportunity']['findUnique']>>>;

const NF = () => new AppError('NOT_FOUND', 404, { opportunity_id: 'not_found' });

/** Khoá các cơ hội (FOR UPDATE, id tăng dần) — người gọi đã khoá họ khách + chứng từ. Trả bản ghi đọc SAU khoá (thiếu → bỏ qua). */
export async function lockOpportunity(tx: TenantTx, ids: readonly (string | null | undefined)[]): Promise<OpportunityRecord[]> {
  const sorted = [...new Set(ids.filter((x): x is string => !!x && UUID.test(x)))].sort();
  if (!sorted.length) return [];
  await tx.$queryRaw`SELECT id FROM contact_opportunity WHERE id = ANY(${sorted}::uuid[]) ORDER BY id FOR UPDATE`;
  const rows = await tx.contactOpportunity.findMany({ where: { id: { in: sorted } } });
  return rows.sort((a, b) => (a.id < b.id ? -1 : 1));
}

/**
 * Action cơ hội: khoá họ khách của cơ hội (ràng buộc cho `applyStageRule`) → [chứng từ `docs`] → khoá cơ hội → kiểm khách cha còn sửa được.
 * Cơ hội đổi khách giữa chừng (gộp) → thử lại một lần rồi 409. Không thấy → 404 (không lộ tồn tại).
 */
export async function lockOpportunityFamily(tx: TenantTx, authz: AuthzContext, id: string, docs?: () => Promise<void>): Promise<{ o: OpportunityRecord; family: StageFamilyBinding }> {
  if (!UUID.test(id)) throw NF();
  for (let i = 0; i < 2; i++) {
    const before = await tx.contactOpportunity.findUnique({ where: { id }, select: { contactId: true } });
    if (!before) throw NF();
    const family = await lockStageFamily(tx, before.contactId);
    // Chứng từ của cơ hội (vd. báo giá sẽ từ chối khi Thua) khoá GIỮA họ khách và cơ hội — đúng thứ tự toàn cục với producer.
    if (docs) await docs();
    const [o] = await lockOpportunity(tx, [id]);
    if (!o) throw NF();
    if (o.contactId !== before.contactId) continue;
    await editableContact(tx, authz, o.contactId);
    return { o, family };
  }
  throw new AppError('CONFLICT', 409, { opportunity_id: 'changed' });
}

/** Đối chiếu version: lệch → 409 STALE_VERSION (kèm version hiện tại). */
export function checkOpportunityVersion(o: Pick<OpportunityRecord, 'version'>, ifVersion: number | undefined) {
  if (ifVersion !== undefined && ifVersion !== o.version) throw new AppError('STALE_VERSION', 409, { version: String(o.version) });
}
