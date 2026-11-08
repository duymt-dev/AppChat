// Khớp định danh chỉ-đọc (TIP-014b D) — dùng khi tài khoản kênh tắt `sync_auto_create_contact`: chỉ trả khách có bằng chứng chắc chắn, KHÔNG
// tạo khách, không gắn identity mới. Cùng thứ tự với ContactIdentityService.resolve: 1) identity (tài khoản, id phía kênh) đã có → khách
// còn hiệu lực (đi theo merged_into_id); 2) SĐT chuẩn hoá khớp ĐÚNG MỘT khách → khách đó; nhiều khách cùng SĐT → `ambiguous` (không tự
// chọn, không gộp theo tên). Email / tên không bao giờ dùng để khớp.
// TIP-015f §3.1: identity đã gắn khách gốc đã xoá mềm → `deleted` (giữ gắn + id, KHÔNG fallback SĐT / tạo khách mới); chuỗi gộp hỏng →
// `unavailable` (không đoán khách).
import { normalizePhone } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { identityState } from '../lifecycle/identity-state';

export type IdentityMatch =
  | { kind: 'known'; contactId: string }
  | { kind: 'phone'; contactId: string }
  | { kind: 'deleted'; contactId: string }
  | { kind: 'unavailable' }
  | { kind: 'ambiguous' }
  | { kind: 'none' };

/** Khách còn hiệu lực — bản đã gộp đi theo `merged_into_id` (tối đa 5 bước). */
export async function liveContact(tx: Pick<TenantTx, 'contact'>, id: string): Promise<string | null> {
  for (let hop = 0, cur: string | null = id; cur && hop < 5; hop++) {
    const c: { deletedAt: Date | null; mergedIntoId: string | null } | null = await tx.contact.findUnique({ where: { id: cur }, select: { deletedAt: true, mergedIntoId: true } });
    if (!c) return null;
    if (!c.deletedAt) return cur;
    cur = c.mergedIntoId;
  }
  return null;
}

export async function matchIdentity(tx: Pick<TenantTx, 'contact' | 'contactIdentity'>, i: { channelAccountId: string; externalId: string; phone?: string | null }): Promise<IdentityMatch> {
  const st = await identityState(tx, i);
  if (st.kind === 'active') return { kind: 'known', contactId: st.contactId };
  if (st.kind === 'soft_deleted') return { kind: 'deleted', contactId: st.contactId };
  if (st.kind === 'unavailable') return { kind: 'unavailable' };
  const phone = normalizePhone(i.phone);
  if (!phone) return { kind: 'none' };
  const hits = await tx.contact.findMany({ where: { phoneNorm: phone, deletedAt: null }, select: { id: true }, take: 2 });
  if (hits.length > 1) return { kind: 'ambiguous' };
  return hits[0] ? { kind: 'phone', contactId: hits[0].id } : { kind: 'none' };
}
