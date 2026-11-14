// Adapter nhập khách hàng (TIP-038b, DC-374): phân loại trùng theo CÙNG luật `contact.import` (SĐT / email trùng trong tệp hoặc khách có
// sẵn của mình → duplicate; khách của người khác → owned, chỉ đếm — không lộ dữ liệu, không giành khách) + thiếu cả SĐT lẫn email → lỗi
// `contact: phone_or_email`. Ghi = action `contact.import` (lô ≤ 500) qua ActionExecutor — không tạo khách bằng đường khác.
import type { TenantDb } from '@appchat/db';
import { normalizePhone } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import type { CheckedRow } from '../services/validation';
import type { Importer, PendingRow, RowCheck, UnitResult, WriteUnit } from './types';

export async function classifyContacts(tx: TenantTx, who: Importer, rows: CheckedRow[]): Promise<RowCheck[]> {
  const actorUserId = who.userId;
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

/** Lô ≤ 500 dòng hợp lệ → MỘT lệnh `contact.import`. */
export const contactUnits = (rows: PendingRow[]): WriteUnit[] => [
  { rows, key: String(rows[0]!.rowNo), input: { rows: rows.map((r) => r.data) } },
];

const keysOf = (d: Record<string, string>) => {
  const p = normalizePhone(d.phone);
  return [p && `p:${p}`, d.email && `e:${d.email.toLowerCase()}`].filter((k): k is string => !!k);
};

/** Khách vừa tạo ↔ dòng theo SĐT / email chuẩn hoá (không theo vị trí — trùng phát sinh lúc ghi thì dòng đó không có id). */
export async function resolveContacts(db: TenantDb, unit: WriteUnit, result: unknown): Promise<UnitResult> {
  const ids = (result as { contact_ids?: string[] }).contact_ids ?? [];
  const byKey = new Map<string, { id: string; code: string | null }>();
  if (ids.length)
    for (const c of await db.contact.findMany({
      where: { id: { in: ids } },
      select: { id: true, code: true, phoneNorm: true, email: true },
    })) {
      if (c.phoneNorm) byKey.set(`p:${c.phoneNorm}`, { id: c.id, code: c.code });
      if (c.email) byKey.set(`e:${c.email.toLowerCase()}`, { id: c.id, code: c.code });
    }
  return new Map(
    unit.rows.map((r) => [
      r.id,
      keysOf(r.data)
        .map((k) => byKey.get(k))
        .find(Boolean) ?? null,
    ]),
  );
}
