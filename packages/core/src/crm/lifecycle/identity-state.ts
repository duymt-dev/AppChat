// Trạng thái định danh đã biết (TIP-015f §3.1): identity (tài khoản, id phía kênh) đã gắn khách → `active` (khách sống, đi theo
// merged_into_id), `soft_deleted` (gốc của họ khách đã xoá mềm — GIỮ gắn + id, không fallback SĐT / tạo khách / gắn lại identity),
// `unavailable` (chuỗi gộp vòng / thiếu đích / quá sâu — không đoán khách). Chưa có identity → `unknown` (luồng tạo / khớp bình thường).
import type { TenantTx } from '../../kernel/actions/action-context';

export type IdentityState =
  | { kind: 'active'; contactId: string }
  | { kind: 'soft_deleted'; contactId: string }
  | { kind: 'unavailable'; contactId: string }
  | { kind: 'unknown' };

const MAX_HOPS = 32;

/** Đi theo merged_into_id tới gốc: sống → active; gốc đã xoá (không gộp tiếp) → soft_deleted; vòng / thiếu / quá sâu → unavailable. */
export async function contactState(tx: Pick<TenantTx, 'contact'>, id: string): Promise<Exclude<IdentityState, { kind: 'unknown' }>> {
  const seen = new Set<string>();
  let cur = id;
  for (let hop = 0; hop < MAX_HOPS; hop++) {
    if (seen.has(cur)) break;
    seen.add(cur);
    const c = await tx.contact.findUnique({ where: { id: cur }, select: { deletedAt: true, mergedIntoId: true } });
    if (!c) break;
    if (!c.deletedAt) return { kind: 'active', contactId: cur };
    if (!c.mergedIntoId) return { kind: 'soft_deleted', contactId: cur };
    cur = c.mergedIntoId;
  }
  return { kind: 'unavailable', contactId: id };
}

export async function identityState(tx: Pick<TenantTx, 'contact' | 'contactIdentity'>, i: { channelAccountId: string; externalId: string }): Promise<IdentityState> {
  const known = await tx.contactIdentity.findUnique({ where: { channelAccountId_externalId: { channelAccountId: i.channelAccountId, externalId: i.externalId } }, select: { contactId: true } });
  return known ? contactState(tx, known.contactId) : { kind: 'unknown' };
}
