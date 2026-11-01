// Ghi khách hàng (Blueprint §3.4 crm, D32): tạo (mã KH, phone_norm, chống giành khách), cập nhật (custom theo định nghĩa),
// ánh xạ input action (`full_name`, `type`) → cột (`name`, `kind`). Dùng trong handler (transaction của executor) và import.
import { AppError, mergeCustomValues, normalizePhone, validateCustomValues, type AuthzContext, type CustomValues } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';
import { nextCode } from '../../kernel/sequence';
import { fieldDefs } from './fields.service';
import type { CrmMembers } from './members.service';

export interface ContactInput {
  full_name?: string;
  title?: string;
  type?: 'individual' | 'business' | 'household';
  group?: 'vip' | 'loyal' | 'new' | 'potential';
  phone?: string;
  email?: string;
  zalo?: string;
  city?: string;
  district?: string;
  address?: string;
  /** YYYY-MM-DD, rỗng = xoá. */
  birthday?: string;
  gender?: string;
  source?: string;
  status?: 'active' | 'potential' | 'inactive';
  owner_user_id?: string;
  note?: string;
  custom?: CustomValues;
}

const blank = (v: string | undefined) => (v === undefined ? undefined : v.trim() || null);
const lowerEmail = (v: string | undefined) => (v === undefined ? undefined : v.trim().toLowerCase() || null);

/** Cột ghi từ input (chỉ khoá được gửi — dùng chung create / update). */
export function columnsOf(i: ContactInput) {
  const phone = blank(i.phone);
  return {
    ...(i.full_name !== undefined ? { name: i.full_name.trim() } : {}),
    ...(i.title !== undefined ? { title: blank(i.title) } : {}),
    ...(i.type ? { kind: i.type } : {}),
    ...(i.group ? { group: i.group } : {}),
    ...(phone !== undefined ? { phone, phoneNorm: normalizePhone(phone) } : {}),
    ...(i.email !== undefined ? { email: lowerEmail(i.email) } : {}),
    ...(i.zalo !== undefined ? { zalo: blank(i.zalo) } : {}),
    ...(i.city !== undefined ? { city: blank(i.city) } : {}),
    ...(i.district !== undefined ? { district: blank(i.district) } : {}),
    ...(i.address !== undefined ? { address: blank(i.address) } : {}),
    ...(i.birthday !== undefined ? { birthday: i.birthday ? new Date(`${i.birthday}T00:00:00Z`) : null } : {}),
    ...(i.gender !== undefined ? { gender: i.gender || null } : {}),
    ...(i.source ? { source: i.source } : {}),
    ...(i.status ? { status: i.status } : {}),
  };
}

/** Vai trò dùng cho quyền xem trường tuỳ biến (`custom_field_def.roles`) — Owner luôn `owner`. */
export const fieldRole = (authz: AuthzContext, roleKey: string) => (authz.isOwner ? 'owner' : roleKey);

/**
 * Khách còn hiệu lực trùng SĐT chuẩn hoá / email (bỏ qua `exceptId`). Chống giành khách (D32): của người khác → 409
 * `CONTACT_OWNED { contact_id, owner_name }` (không trả dữ liệu khách); của mình / chưa ai phụ trách → 409 `CONFLICT`.
 */
export async function assertNoDuplicate(tx: TenantTx, members: CrmMembers, me: string | null, cols: { phoneNorm?: string | null; email?: string | null }, exceptId?: string) {
  const or = [...(cols.phoneNorm ? [{ phoneNorm: cols.phoneNorm }] : []), ...(cols.email ? [{ email: cols.email }] : [])];
  if (!or.length) return;
  const dup = await tx.contact.findFirst({ where: { deletedAt: null, OR: or, ...(exceptId ? { id: { not: exceptId } } : {}) }, select: { id: true, ownerUserId: true, phoneNorm: true } });
  if (!dup) return;
  if (dup.ownerUserId && dup.ownerUserId !== me) {
    const owner = (await members.names([dup.ownerUserId])).get(dup.ownerUserId) ?? '';
    throw new AppError('CONTACT_OWNED', 409, { contact_id: dup.id, owner_name: owner });
  }
  const field = cols.phoneNorm && dup.phoneNorm === cols.phoneNorm ? 'phone' : 'email';
  throw new AppError('CONFLICT', 409, { [field]: 'duplicate', contact_id: dup.id });
}

/** Kiểm `custom` theo định nghĩa hiện hành — lỗi → 422 `custom.<key>`. */
export async function checkCustom(tx: TenantTx, values: CustomValues | undefined, role: string, mode: 'create' | 'update') {
  if (mode === 'update' && values === undefined) return;
  const errs = validateCustomValues(await fieldDefs(tx, 'contact'), values, role, mode);
  if (Object.keys(errs).length) throw new AppError('VALIDATION_FAILED', 422, errs);
}

export interface CreateOptions {
  workspaceId: string;
  authz: AuthzContext;
  roleKey: string;
  actorUserId: string | null;
  now: Date;
  members: CrmMembers;
  /** Import bỏ qua kiểm trường bắt buộc tuỳ biến (file không có cột). */
  skipRequiredCustom?: boolean;
}

/** Tạo khách — trả dòng đã tạo. Người phụ trách: input (phải là thành viên) hoặc người tạo. */
export async function createContact(tx: TenantTx, i: ContactInput & { full_name: string }, o: CreateOptions) {
  const cols = columnsOf(i);
  await assertNoDuplicate(tx, o.members, o.actorUserId, cols);
  await checkCustom(tx, i.custom, fieldRole(o.authz, o.roleKey), o.skipRequiredCustom ? 'update' : 'create');
  const owner = i.owner_user_id ?? o.actorUserId;
  if (i.owner_user_id && i.owner_user_id !== o.actorUserId) {
    // Gán khách cho người khác lúc tạo = chuyển phụ trách → cần crm.reassign (D32).
    if (!o.authz.isOwner && !o.authz.permissions.has('crm.reassign')) throw new AppError('FORBIDDEN', 403, { permission: 'crm.reassign' });
    await o.members.assertMember(o.workspaceId, i.owner_user_id, 'owner_user_id');
  }
  const id = uuidv7(o.now.getTime());
  return tx.contact.create({
    data: {
      id,
      code: await nextCode(tx, 'contact'),
      name: i.full_name.trim(),
      source: 'manual',
      ...cols,
      ownerUserId: owner,
      custom: mergeCustomValues({}, i.custom),
      createdByUserId: o.actorUserId,
      lastInteractionAt: o.now,
      createdAt: o.now,
    },
  });
}
