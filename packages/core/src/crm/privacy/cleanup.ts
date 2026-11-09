// Erase CRM (TIP-015c §2.3 hàng 1, pha 1 — domain thí điểm chứng minh adapter pattern thật, 12 domain còn lại đăng ký ở pha 2). Mỗi
// kind xoá CHÍNH XÁC record_id đã liệt kê ở inventory.ts — artifact đã được chuyển `erase_pending` trước khi gọi (service/operation.ts).
import { AppError } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';

const EXCLUSIVE_DELETE = new Set(['contact_identity', 'contact_tag', 'contact_collaborator', 'contact_access_request', 'timeline_event', 'contact_task', 'contact_opportunity']);

export async function crmErase(tx: TenantTx, artifact: { kind: string; recordId: string }, disposition: 'erase_exclusive' | 'redact_shared'): Promise<void> {
  if (disposition !== 'erase_exclusive') throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'crm: redact_shared chưa cài (không có artifact shared trong domain này)');
  if (EXCLUSIVE_DELETE.has(artifact.kind)) {
    const table = artifact.kind;
    await tx.$executeRawUnsafe(`DELETE FROM "${table}" WHERE id = $1::uuid`, artifact.recordId);
    return;
  }
  if (artifact.kind === 'contact_note') {
    await tx.$executeRaw`UPDATE contact_note SET body = '', deleted_at = COALESCE(deleted_at, now()) WHERE id = ${artifact.recordId}::uuid`;
    return;
  }
  throw new AppError('NOT_IMPLEMENTED', 501, undefined, `crm: kind không rõ '${artifact.kind}'`);
}
