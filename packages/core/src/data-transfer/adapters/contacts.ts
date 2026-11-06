// Adapter nhập khách hàng (TIP-038b, DC-374): phân loại trùng theo CÙNG luật `contact.import` (SĐT / email trùng trong tệp hoặc khách có
// sẵn của mình → duplicate; khách của người khác → owned, chỉ đếm — không lộ dữ liệu, không giành khách) + thiếu cả SĐT lẫn email → lỗi
// `contact: phone_or_email`. Ghi = action `contact.import` (lô ≤ 500) qua ActionExecutor — không tạo khách bằng đường khác.
import { normalizePhone } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import type { CheckedRow } from '../services/validation';
import type { RowCheck } from './types';

export async function classifyContacts(
  tx: TenantTx,
  actorUserId: string,
  rows: CheckedRow[],
): Promise<RowCheck[]> {
  const seen = new Set<string>();
  const out: RowCheck[] = [];
  for (const r of rows) {
    const phone = normalizePhone(r.data.phone);
    const email = r.data.email || null;
    if (!phone && !email) {
      if (!Object.keys(r.errors).length) r.errors.contact = 'required';
      out.push('invalid');
      continue;
    }
    const keys = [phone && `p:${phone}`, email && `e:${email}`].filter((k): k is string => !!k);
    if (keys.some((k) => seen.has(k))) {
      out.push('duplicate');
      continue;
    }
    keys.forEach((k) => seen.add(k));
    const hit = await tx.contact.findFirst({
      where: {
        deletedAt: null,
        OR: [...(phone ? [{ phoneNorm: phone }] : []), ...(email ? [{ email }] : [])],
      },
      select: { ownerUserId: true },
    });
    out.push(!hit ? 'valid' : hit.ownerUserId && hit.ownerUserId !== actorUserId ? 'owned' : 'duplicate');
  }
  return out;
}

/** Nhóm dòng hợp lệ → input `contact.import` (một lô). Trường ngoài schema action không có trong registry. */
export const contactImportInput = (rows: { data: Record<string, string> }[]) => ({
  rows: rows.map((r) => r.data),
});
