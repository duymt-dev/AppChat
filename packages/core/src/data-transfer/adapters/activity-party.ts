// Tra khách cho dòng hoạt động CRM nhập (TIP-026b §5.2): mã khách / SĐT / email → ĐÚNG MỘT khách người nhập ghi được (cùng guard
// `editableContact` của action). Không thấy / ngoài phạm vi → `contact: not_found`; khớp nhiều → `ambiguous` (người dùng chọn, không đoán);
// không tạo khách (nhập khách là tập `base` riêng, xác nhận trước). Mã khách ưu tiên khi có (định danh chính xác nhất).
import { normalizePhone } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { editableContact } from '../../crm/public';
import type { Importer } from './types';

export type ActivityParty = { contactId: string } | { error: 'required' | 'not_found' | 'ambiguous' };

export function activityPartyResolver(tx: TenantTx, who: Importer) {
  const cache = new Map<string, ActivityParty>();
  return async (d: Record<string, string>): Promise<ActivityParty> => {
    const code = d.contact_code?.trim() || null;
    const phone = normalizePhone(d.contact_phone);
    const email = d.contact_email?.toLowerCase() || null;
    if (!code && !phone && !email) return { error: 'required' };
    const key = `${code ?? ''}|${phone ?? ''}|${email ?? ''}`;
    const hit = cache.get(key);
    if (hit) return hit;
    const where = code
      ? { deletedAt: null, code }
      : { deletedAt: null, OR: [...(phone ? [{ phoneNorm: phone }] : []), ...(email ? [{ email }] : [])] };
    const found = await tx.contact.findMany({ where, select: { id: true }, take: 5 });
    const writable: string[] = [];
    for (const c of found)
      if (await editableContact(tx, who.authz, c.id).then(() => true, () => false)) writable.push(c.id);
    const r: ActivityParty = !writable.length
      ? { error: 'not_found' }
      : writable.length > 1
        ? { error: 'ambiguous' }
        : { contactId: writable[0]! };
    cache.set(key, r);
    return r;
  };
}
