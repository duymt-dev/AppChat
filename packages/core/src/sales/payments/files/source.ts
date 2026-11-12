// Adapter tệp đính kèm ĐỀ NGHỊ THANH TOÁN (TIP-032d §1.1, §1.5, §2.4): bảng `invoice_attachment` + nguồn tệp kernel. Đọc tệp = đề nghị còn
// thấy được theo scope sales hiện hành + (liên kết sống HOẶC đúng chứng từ đã sinh của đề nghị: invoice.file_id / phiếu thu của khoản thu).
import type { AuthzContext } from '@appchat/shared';
import { can } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import type { RecordFileSource } from '../../../kernel/files/file-claims';
import type { AttachmentTable } from '../../files/association';
import { visibleInvoice } from '../invoice-access';

export const invoiceAttachments: AttachmentTable = {
  type: 'invoice',
  async find(tx, id) {
    const r = await tx.invoiceAttachment.findUnique({ where: { id } });
    return r ? { ...r, parentId: r.invoiceId } : null;
  },
  live: (tx, parentId, fileId) => tx.invoiceAttachment.findFirst({ where: { invoiceId: parentId, fileId, detachedAt: null } }),
  async create(tx, r) {
    await tx.invoiceAttachment.create({ data: { id: r.id, invoiceId: r.parentId, fileId: r.fileId, createdBy: r.createdBy, createdAt: r.createdAt } });
  },
  async detach(tx, id, version, by, now) {
    return (await tx.invoiceAttachment.updateMany({ where: { id, version, detachedAt: null }, data: { detachedAt: now, detachedBy: by, version: { increment: 1 } } })).count;
  },
  holds: async (tx, fileId) => !!(await tx.invoiceAttachment.findFirst({ where: { fileId, detachedAt: null }, select: { id: true } })),
};

/** Chứng từ đã sinh của một đề nghị (PDF đề nghị đã gửi + phiếu thu) — id tệp theo thứ tự đề nghị trước. */
export async function generatedFileIds(tx: TenantTx, invoiceId: string, fileId: string | null): Promise<{ id: string; kind: 'generated_invoice' | 'generated_receipt' }[]> {
  const receipts = await tx.customerPayment.findMany({ where: { invoiceId, receiptFileId: { not: null } }, orderBy: { createdAt: 'asc' }, select: { receiptFileId: true } });
  return [...(fileId ? [{ id: fileId, kind: 'generated_invoice' as const }] : []), ...receipts.map((r) => ({ id: r.receiptFileId!, kind: 'generated_receipt' as const }))];
}

export const invoiceFileSource: RecordFileSource = {
  parentType: 'invoice',
  async canRead(tx: TenantTx, authz: AuthzContext, parentId: string, fileId: string) {
    if (!can(authz, 'invoice.manage')) return false;
    const i = await visibleInvoice(tx, authz, parentId).catch(() => null);
    return !!i && !!(await invoiceAttachments.live(tx, parentId, fileId));
  },
  holds: (tx, fileId) => invoiceAttachments.holds(tx, fileId),
};
