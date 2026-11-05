// Một bản ghi của contact.bulk_update (TIP-045b annex D) — dùng chung đường chạy ngay (≤ 50, mỗi khách một savepoint) và việc nền (mỗi
// khách một transaction cùng biên nhận). Cùng luật với contact.update + contact.tag: scope sửa (watcher / ngoài scope → lỗi bản ghi đó),
// trường tuỳ biến theo vai trò, không đổi người phụ trách (patch đã loại). Khách không đổi gì → `skipped` (chạy lại không ghi thêm).
import { mergeCustomValues, type AuthzContext, type CustomValues } from '@appchat/shared';
import type { ActionInput, contactBulkUpdate } from '@appchat/actions';
import type { TenantTx } from '../../kernel/actions/action-context';
import { editableContact } from './access';
import { checkCustom, columnsOf } from './contacts.service';
import { tagByName } from './contact-tags';

const same = (a: unknown, b: unknown) => (a instanceof Date || b instanceof Date ? String(a && new Date(a as Date).getTime()) === String(b && new Date(b as Date).getTime()) : JSON.stringify(a ?? null) === JSON.stringify(b ?? null));

export type BulkPatch = ActionInput<typeof contactBulkUpdate>['patch'];

export interface BulkActor {
  authz: AuthzContext;
  /** Vai trò trường (fieldRole) của người tạo việc. */
  fieldRole: string;
  userId: string | null;
  now: Date;
}

export async function applyBulkPatch(tx: TenantTx, a: BulkActor, contactId: string, patch: BulkPatch): Promise<'done' | 'skipped'> {
  const { contact: c } = await editableContact(tx, a.authz, contactId);
  const { custom, add_tags, remove_tags, ...rest } = patch;
  await checkCustom(tx, custom, a.fieldRole, 'update');
  // Chỉ cột / giá trị tuỳ biến thật sự khác hiện tại — chạy lại cùng patch không ghi (updatedAt giữ nguyên, biên nhận `skipped`).
  const cur = c as unknown as Record<string, unknown>;
  const cols = Object.fromEntries(Object.entries(columnsOf(rest)).filter(([k, v]) => !same(cur[k], v)));
  const next = custom === undefined ? undefined : mergeCustomValues(c.custom as CustomValues, custom);
  const merged = next && !same(c.custom, next) ? next : undefined;
  let changed = false;
  if (Object.keys(cols).length || merged) {
    await tx.contact.update({ where: { id: c.id }, data: { ...cols, ...(merged ? { custom: merged } : {}), updatedAt: a.now } });
    changed = true;
  }
  for (const name of add_tags ?? []) {
    const tag = await tagByName(tx, name, a.userId, a.now, true);
    if (tag) changed = (await tx.contactTag.createMany({ data: [{ contactId: c.id, tagId: tag.id, createdAt: a.now }], skipDuplicates: true })).count > 0 || changed;
  }
  for (const name of remove_tags ?? []) {
    const tag = await tagByName(tx, name, a.userId, a.now, false);
    if (tag) changed = (await tx.contactTag.deleteMany({ where: { contactId: c.id, tagId: tag.id } })).count > 0 || changed;
  }
  return changed ? 'done' : 'skipped';
}
