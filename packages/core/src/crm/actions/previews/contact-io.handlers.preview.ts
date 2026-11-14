// Preview nhập khách (TIP-023b R2.8, bulk): phân loại từng dòng tạo / trùng / của người khác / lỗi (cùng hàm execute dùng) → số đếm + danh
// sách ≤ 20 khách sẽ tạo. Dòng trùng khách của người khác chỉ đếm, không lộ dữ liệu khách đó (chống giành khách). Chỉ đọc.
import { interpolate, normalizePhone, serverMessages } from '@appchat/shared';
import type { ActionInput, ActionPreview, contactImport } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { preview } from '../../../kernel/actions/preview-kit';
import { actorUserId } from '../../services/access';

type Row = ActionInput<typeof contactImport>['rows'][number];
export type ImportKind = 'create' | 'dup' | 'owned' | 'invalid';

/** Thiếu SĐT + email / email sai → invalid; trùng trong file hoặc với khách có sẵn của mình → dup, của người khác → owned. */
export async function classifyImport(ctx: ActionContext, rows: Row[], tx: TenantTx) {
  const me = actorUserId(ctx);
  const seen = new Set<string>();
  const out: { row: Row; kind: ImportKind }[] = [];
  for (const row of rows) {
    const phone = normalizePhone(row.phone);
    const email = row.email?.trim().toLowerCase() || null;
    if ((!phone && !email) || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      out.push({ row, kind: 'invalid' });
      continue;
    }
    const keys = [phone && `p:${phone}`, email && `e:${email}`].filter((k): k is string => !!k);
    if (keys.some((k) => seen.has(k))) {
      out.push({ row, kind: 'dup' });
      continue;
    }
    keys.forEach((k) => seen.add(k));
    const or = [...(phone ? [{ phoneNorm: phone }] : []), ...(email ? [{ email }] : [])];
    const hit = await tx.contact.findFirst({ where: { deletedAt: null, OR: or }, select: { ownerUserId: true } });
    out.push({ row, kind: !hit ? 'create' : hit.ownerUserId && hit.ownerUserId !== me ? 'owned' : 'dup' });
  }
  return out;
}

export async function importPreview(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof contactImport>): Promise<ActionPreview> {
  const c = await classifyImport(ctx, i.rows, tx);
  const n = (k: ImportKind) => c.filter((x) => x.kind === k).length;
  const create = c.filter((x) => x.kind === 'create');
  return preview('write', interpolate(serverMessages('vi').crm.preview.import, { count: c.length, created: n('create'), dup: n('dup'), owned: n('owned'), invalid: n('invalid') }), {
    count: create.length,
    changes: create.slice(0, 20).map((x) => ({ entity: 'contact', after: { name: x.row.full_name, phone: normalizePhone(x.row.phone) || null, email: x.row.email?.trim().toLowerCase() || null } })),
  });
}
