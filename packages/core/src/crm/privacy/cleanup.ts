// Erase CRM (TIP-015c §2.3 hàng 1, pha 1 — domain thí điểm chứng minh adapter pattern thật, 12 domain còn lại đăng ký ở pha 2). Hai
// nhóm kind: có PK `id` riêng (xoá theo `id` = record_id) và bảng khoá kép không có cột `id` (contact_tag/contact_collaborator —
// inventory.ts dùng `contact_id` LÀM record_id vì không có id dòng; artifact dedup theo (kind, record_id, revision) nên mỗi contact
// chỉ có MỘT artifact "contact_tag" dù có N dòng thẻ — xoá hết theo contact_id, không phải theo một dòng con).
import { AppError } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';

const EXCLUSIVE_DELETE_BY_ID = new Set(['contact_identity', 'contact_access_request', 'timeline_event', 'contact_task', 'contact_opportunity']);
const EXCLUSIVE_DELETE_BY_CONTACT = new Set(['contact_tag', 'contact_collaborator']);

export async function crmErase(tx: TenantTx, artifact: { kind: string; recordId: string }, disposition: 'erase_exclusive' | 'redact_shared'): Promise<void> {
  if (disposition !== 'erase_exclusive') throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'crm: redact_shared chưa cài (không có artifact shared trong domain này)');
  if (EXCLUSIVE_DELETE_BY_ID.has(artifact.kind)) {
    await tx.$executeRawUnsafe(`DELETE FROM "${artifact.kind}" WHERE id = $1::uuid`, artifact.recordId);
    return;
  }
  if (EXCLUSIVE_DELETE_BY_CONTACT.has(artifact.kind)) {
    await tx.$executeRawUnsafe(`DELETE FROM "${artifact.kind}" WHERE contact_id = $1::uuid`, artifact.recordId);
    return;
  }
  if (artifact.kind === 'contact_note') {
    await tx.$executeRaw`UPDATE contact_note SET body = '', deleted_at = COALESCE(deleted_at, now()) WHERE id = ${artifact.recordId}::uuid`;
    return;
  }
  throw new AppError('NOT_IMPLEMENTED', 501, undefined, `crm: kind không rõ '${artifact.kind}'`);
}
