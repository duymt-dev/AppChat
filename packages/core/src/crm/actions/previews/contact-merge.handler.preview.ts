// Preview gộp khách trùng (TIP-023b R2.8, bulk): mỗi cặp `<chính>~<phụ>` → tên + mã hai bản, số hội thoại / ghi chú / timeline chuyển sang bản
// chính, trường còn trống được lấp từ bản phụ; bản phụ xoá mềm. Trí nhớ: số fact sau chống trùng / bị bỏ vì trần 50 (TIP-015b). Cặp sai → 422, khách ngoài quyền sửa → 404 như execute. Chỉ đọc.
import { AppError } from '@appchat/shared';
import type { ActionInput, ActionPreview, contactMerge } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { preview, type Change } from '../../../kernel/actions/preview-kit';
import { UUID, editableContact } from '../../services/access';
import { planMerge } from '../../memory/merge';

const FILL = ['email', 'zalo', 'title', 'city', 'district', 'taxCode', 'address'] as const;

export async function mergePreview(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof contactMerge>): Promise<ActionPreview> {
  const changes: Change[] = [];
  for (const g of i.group_ids) {
    const [a, b] = g.split('~');
    if (!a || !b || a === b || !UUID.test(a) || !UUID.test(b)) throw new AppError('VALIDATION_FAILED', 422, { group_ids: 'invalid' });
    const { contact: p } = await editableContact(tx, ctx.authz, a);
    const { contact: d } = await editableContact(tx, ctx.authz, b);
    const [identities, notes, timeline, memory] = await Promise.all([
      tx.contactIdentity.count({ where: { contactId: d.id } }),
      tx.contactNote.count({ where: { contactId: d.id } }),
      tx.timelineEvent.count({ where: { contactId: d.id } }),
      planMerge(tx, p.id, d.id),
    ]);
    const fill = Object.fromEntries(FILL.filter((k) => !p[k] && d[k]).map((k) => [k, d[k]]));
    changes.push({ entity: 'contact', id: d.id, before: { code: d.code, name: d.name }, after: { merged_into: p.code, identities, notes, timeline, memory } });
    if (Object.keys(fill).length) changes.push({ entity: 'contact', id: p.id, before: Object.fromEntries(Object.keys(fill).map((k) => [k, null])), after: fill });
  }
  return preview('write', `${i.group_ids.length}`, { count: i.group_ids.length, changes });
}
