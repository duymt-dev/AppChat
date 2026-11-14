// Cổng bản ghi ĐỀ NGHỊ cho tệp đính kèm (TIP-032d §1.2, §1.5): khoá khách gốc → đề nghị FOR UPDATE + scope sales GHI; chứng từ đã sinh
// (PDF đề nghị đã gửi, phiếu thu) liệt kê cùng tab để mở / tải — giữ đúng id tệp gốc bất biến, KHÔNG gỡ / thay; tệp gốc mất → `available:false`.
import type { TenantTx } from '../../../kernel/actions/action-context';
import { lockContactRow } from '../../../kernel/ownership/root-lock';
import type { FileRowOut } from '../../files/association';
import type { RecordPort } from '../../files/handlers-kit';
import { lockInvoice, visibleInvoice } from '../invoice-access';
import { generatedFileIds, invoiceAttachments } from './source';

async function lockWritable(tx: TenantTx, authz: Parameters<RecordPort['lockWritable']>[1], id: string) {
  const i = await visibleInvoice(tx, authz, id);
  await lockContactRow(tx, i.contactId);
  const cur = await lockInvoice(tx, authz, id);
  return { code: cur.code };
}

async function generated(tx: TenantTx, id: string): Promise<FileRowOut[]> {
  const inv = await tx.invoice.findUnique({ where: { id }, select: { fileId: true } });
  const refs = await generatedFileIds(tx, id, inv?.fileId ?? null);
  const files = new Map((refs.length ? await tx.file.findMany({ where: { id: { in: refs.map((r) => r.id) } }, select: { id: true, name: true, mime: true, size: true, createdAt: true } }) : []).map((f) => [f.id, f]));
  return refs.map((r) => {
    const f = files.get(r.id);
    return { attachment_id: null, file_id: r.id, name: f?.name ?? '', mime: f?.mime ?? 'application/pdf', bytes: Number(f?.size ?? 0), created_at: (f?.createdAt ?? new Date(0)).toISOString(), created_by: null, kind: r.kind, version: null, available: !!f, can_detach: false };
  });
}

export const invoicePort: RecordPort = {
  table: invoiceAttachments,
  sql: 'invoice_attachment',
  idField: 'invoice_id',
  lockWritable,
  readable: async (tx, authz, id) => ({ code: (await visibleInvoice(tx, authz, id)).code }),
  writable: (tx, authz, id) => visibleInvoice(tx, authz, id, 'write').then(() => authz.isOwner || authz.permissions.has('invoice.manage'), () => false),
  generated,
};
