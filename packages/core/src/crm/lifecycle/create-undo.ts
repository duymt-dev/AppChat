// Hoàn tác tạo / nhập khách (TIP-015f §5.1–§5.2): KHÔNG BAO GIỜ `DELETE`. Biên nhận lúc tạo ghi `after = {id, version, note_ids}`; hoàn tác cần
// quyền xoá hiện tại (crm.delete + scope ghi — không chỉ quyền action gốc), khách còn sống / chưa gộp / đúng phiên bản lúc tạo, KHÔNG có quan hệ
// nghiệp vụ nào sau đó (7 port — chặt hơn xoá thường: cả mục đã đóng / cảnh báo) và ghi chú CRM khớp đúng tập lúc tạo. Đạt → cùng dịch vụ xoá
// mềm (biên nhận 30 ngày, hàng rào AI, giữ dữ liệu). Lô nhập: khoá id tăng dần, kiểm TẤT CẢ trước khi xoá bất kỳ — một khách không đạt → 409
// cả lô. Biên nhận cũ không có phiên bản → 409 (không đoán).
import { AppError, can, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { lockFamily } from './lock';
import { familyHasRelations } from './dependencies';
import { assertDeleteAuthority } from './authority';
import { accessOf } from '../services/access';
import { deleteContact } from './service';

type Ev = { topic: string; payload: Record<string, unknown> };
export interface CreatedReceipt {
  id: string;
  version: number;
  note_ids: string[];
}

/** Biên nhận tạo khách (ghi vào `after` của action log). */
export async function createdReceipt(tx: TenantTx, id: string): Promise<CreatedReceipt> {
  const [c, notes] = await Promise.all([
    tx.contact.findUniqueOrThrow({ where: { id }, select: { version: true } }),
    tx.contactNote.findMany({ where: { contactId: id }, select: { id: true }, orderBy: { id: 'asc' } }),
  ]);
  return { id, version: c.version, note_ids: notes.map((n) => n.id) };
}

const conflict = (field: string) => new AppError('CONFLICT', 409, { contact_id: field });

/** Kiểm một khách đã khoá: còn nguyên trạng như lúc tạo. */
async function assertPristine(tx: TenantTx, authz: AuthzContext, r: CreatedReceipt): Promise<string[]> {
  const fam = await lockFamily(tx, r.id).catch((e: unknown) => {
    // Đã xoá / gộp / không có → không còn là bản tạo nguyên trạng.
    if (e instanceof AppError && e.httpStatus === 404) throw conflict('changed');
    throw e;
  });
  const c = fam.root;
  if (c.deletedAt) throw conflict('changed');
  assertDeleteAuthority(authz, c, !!(await accessOf(tx, authz, c)));
  if (c.version !== r.version) throw conflict('changed');
  if (await familyHasRelations(tx, fam.ids)) throw conflict('has_relations');
  const notes = await tx.contactNote.findMany({ where: { contactId: c.id }, select: { id: true }, orderBy: { id: 'asc' } });
  if (notes.map((n) => n.id).join(',') !== [...r.note_ids].sort().join(',')) throw conflict('has_relations');
  return fam.ids;
}

/** Hoàn tác tạo / nhập: tất cả hoặc 409. Trả event `contact.deleted` để người gọi ghi outbox. */
export async function undoCreated(tx: TenantTx, authz: AuthzContext, receipts: unknown[], a: { logId: string; actorUserId: string | null; now: Date }): Promise<Ev[]> {
  if (!can(authz, 'crm.delete')) throw new AppError('FORBIDDEN', 403, { permission: 'crm.delete' });
  const rs = receipts.map((x) => x as Partial<CreatedReceipt>);
  if (rs.some((r) => typeof r.id !== 'string' || typeof r.version !== 'number' || !Array.isArray(r.note_ids))) throw new AppError('CONFLICT', 409, { receipt: 'legacy' });
  const sorted = (rs as CreatedReceipt[]).slice().sort((x, y) => x.id.localeCompare(y.id));
  for (const r of sorted) await assertPristine(tx, authz, r);
  const events: Ev[] = [];
  for (const r of sorted) {
    const out = await deleteContact(tx, authz, { contactId: r.id, operationId: `undo:${a.logId}:${r.id}`, actorUserId: a.actorUserId, now: a.now });
    events.push(...out.events);
  }
  return events;
}
