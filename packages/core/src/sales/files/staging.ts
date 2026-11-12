// Tải lên tệp đính kèm bản ghi (TIP-032d §2.1–2.2): đích đơn / đề nghị đăng ký vào registry kernel (`attachment-targets`) — kiểm quyền GHI
// cha hiện hành TRƯỚC khi lưu, rồi staging `pending` gắn digest. TIP-027b: sản phẩm đăng ký cùng registry (kernel không import domain).
import { AppError, type PermissionKey } from '@appchat/shared';
import type { AttachmentTarget } from '../../kernel/files/attachment-targets';
import { orderPort } from '../orders/files/read';
import { invoicePort } from '../payments/files/read';

export { uploadRecordAttachment, type StagedUpload } from '../../kernel/files/attachment-targets';

const target = (parentType: 'order' | 'invoice', perm: PermissionKey, port: typeof orderPort): AttachmentTarget => ({
  parentType,
  profile: 'record',
  async assertWritable(tx, authz, id) {
    if (!authz.isOwner && !authz.permissions.has(perm)) throw new AppError('FORBIDDEN', 403, { permission: perm });
    await port.readable(tx, authz, id);
    if (!(await port.writable(tx, authz, id))) throw new AppError('SCOPE_FORBIDDEN', 403, { parent: 'read_only' });
  },
});

export const COMMERCE_ATTACHMENT_TARGETS = [target('order', 'order.manage', orderPort), target('invoice', 'invoice.manage', invoicePort)];
