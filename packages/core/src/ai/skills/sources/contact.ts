// Nguồn "khách" cho kỹ năng tiện ích (TIP-019c §2.1): khách còn hiệu lực theo scope crm hiện tại (watcher D32 vẫn chỉ đọc; không thấy /
// đã xoá → 404). Chỉ chiếu cột hẹp: tên, giai đoạn, nhóm, thẻ, trường tuỳ biến người xem được thấy (FieldPolicy 045b), mốc tương tác gần
// nhất — KHÔNG tiền (tổng chi / điểm), điện thoại / email / địa chỉ / ngày sinh / giới tính, tóm tắt AI cũ. Bản phụ đã gộp → 404 (gọi theo khách gốc).
import { AppError, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { visibleContact } from '../../../crm/public';
import { fieldView, projectCustom } from '../../../authz/fields';
import type { SourceChunk } from './types';

export interface ContactSource {
  contactId: string;
  chunks: SourceChunk[];
}

export async function contactSource(tx: TenantTx, authz: AuthzContext, contactId: string): Promise<ContactSource> {
  const { contact: c } = await visibleContact(tx, authz, contactId);
  if (c.mergedIntoId) throw new AppError('NOT_FOUND', 404, { contact_id: 'not_found' });
  const tags = await tx.contactTag.findMany({ where: { contactId: c.id }, select: { tagId: true }, take: 30 });
  const names = tags.length ? await tx.tag.findMany({ where: { id: { in: tags.map((t) => t.tagId) } }, select: { name: true } }) : [];
  const custom = projectCustom(await fieldView(tx, 'contact', authz), c.custom);
  const lines = [
    `name: ${c.name}`,
    `stage: ${c.stage}`,
    c.group ? `group: ${c.group}` : null,
    names.length ? `tags: ${names.map((t) => t.name).join(', ')}` : null,
    `last_interaction: ${c.lastInteractionAt.toISOString().slice(0, 10)}`,
    ...Object.entries(custom)
      .filter(([, v]) => v !== null && v !== '' && typeof v !== 'object')
      .slice(0, 20)
      .map(([k, v]) => `${k}: ${String(v).slice(0, 200)}`),
  ].filter((l): l is string => !!l);
  return { contactId: c.id, chunks: [{ id: `c:${c.id}`, text: lines.join('\n'), label: 'crm contact facts', binding: { contact_id: c.id, updated_at: c.updatedAt.toISOString() } }] };
}
