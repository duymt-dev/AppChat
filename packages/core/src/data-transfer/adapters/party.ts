// Tra khách của chứng từ nhập (TIP-038b P2): SĐT / email / mã khách trong tệp → MỘT khách người nhập GHI được (cùng guard
// `editableContact` của action tạo). Không thấy / nhiều khách khớp / khách ngoài phạm vi → lỗi `contact: not_found | ambiguous` —
// không lộ tên khách người khác, không đoán khi trùng (AI hỏi lại ở P3). Kết quả tra cache theo khoá trong một lần phân loại.
import { normalizePhone } from '@appchat/shared';
import { POLICIES, allows } from '../../authz/data-access';
import type { TenantTx } from '../../kernel/actions/action-context';
import type { Importer } from './types';

export type PartyHit = { contactId: string } | { error: 'required' | 'not_found' | 'ambiguous' };

export function partyResolver(tx: TenantTx, who: Importer) {
  const cache = new Map<string, PartyHit>();
  return async (d: Record<string, string>): Promise<PartyHit> => {
    const phone = normalizePhone(d.contact_phone);
    const email = d.contact_email?.toLowerCase() || null;
    const code = d.contact_code?.trim() || null;
    if (!phone && !email && !code) return { error: 'required' };
    const key = `${phone ?? ''}|${email ?? ''}|${code ?? ''}`;
    const hit = cache.get(key);
    if (hit) return hit;
    const found = await tx.contact.findMany({
      where: {
        deletedAt: null,
        OR: [
          ...(code ? [{ code }] : []),
          ...(phone ? [{ phoneNorm: phone }] : []),
          ...(email ? [{ email }] : []),
        ],
      },
      select: { id: true, ownerUserId: true, teamId: true },
      take: 5,
    });
    const writable = [];
    for (const c of found)
      if (
        await allows(tx, who.authz, POLICIES.crm, 'write', {
          owner: c.ownerUserId,
          team: c.teamId ?? null,
          contact: c.id,
        })
      )
        writable.push(c);
    const r: PartyHit = !writable.length
      ? { error: 'not_found' }
      : writable.length > 1
        ? { error: 'ambiguous' }
        : { contactId: writable[0]!.id };
    cache.set(key, r);
    return r;
  };
}
