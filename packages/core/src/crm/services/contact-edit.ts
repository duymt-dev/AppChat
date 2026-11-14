// Ngữ cảnh form sửa khách (TIP-025b §D.3) — một reader cho `GET /v1/contacts/:id/edit-context` và action `contact.get_edit_context`.
// Thấy được mới đọc (404 như không tồn tại); trường hệ thống bị FieldPolicy ẩn bỏ HẲN khỏi `values` + `hidden_fields`; `custom` chiếu theo
// quyền trường. `editable` = crm.edit + scope ghi (watcher false); `can_transfer` = crm.reassign. Tên người phụ trách lấy từ danh bạ
// thành viên — không có → null (FE hiện "không xem được", không bịa).
import { CONTACT_EDIT_FIELDS, type AuthzContext, type ContactEditContextDto } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { fieldView, projectCustom } from '../../authz/public';
import { visibleContact } from './access';

type Contact = Awaited<ReturnType<typeof visibleContact>>['contact'];

const dateOnly = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

/** Cột DB → tên trường form (cùng tên với `contactFields`). */
function valuesOf(c: Contact): Record<(typeof CONTACT_EDIT_FIELDS)[number], string | null> {
  return {
    full_name: c.name,
    title: c.title,
    type: c.kind,
    group: c.group,
    phone: c.phone,
    email: c.email,
    zalo: c.zalo,
    city: c.city,
    district: c.district,
    address: c.address,
    birthday: dateOnly(c.birthday),
    gender: c.gender,
    source: c.source,
    status: c.status,
  };
}

/** Tên cột hệ thống trong FieldPolicy → tên trường form (chỉ những trường khác tên). */
const POLICY_FIELD: Record<string, string> = { name: 'full_name', kind: 'type' };

export async function contactEditContext(tx: TenantTx, authz: AuthzContext, id: string, names: (ids: string[]) => Promise<Map<string, string>>): Promise<ContactEditContextDto> {
  const { contact: c, writable } = await visibleContact(tx, authz, id);
  const fv = await fieldView(tx, 'contact', authz);
  const hidden = [...fv.hiddenSystem].map((f) => POLICY_FIELD[f] ?? f);
  const values: Record<string, string | null> = valuesOf(c);
  for (const f of hidden) delete values[f];
  const owner = c.ownerUserId ? ((await names([c.ownerUserId])).get(c.ownerUserId) ?? null) : null;
  return {
    id: c.id,
    code: c.code,
    version: c.version,
    editable: writable && (authz.isOwner || authz.permissions.has('crm.edit')),
    can_transfer: authz.isOwner || authz.permissions.has('crm.reassign'),
    owner_user_id: c.ownerUserId,
    owner_name: owner,
    values,
    custom: projectCustom(fv, c.custom),
    hidden_fields: hidden.filter((f) => (CONTACT_EDIT_FIELDS as readonly string[]).includes(f)),
  };
}
