// Adapter tệp đính kèm ĐƠN (TIP-032d §1.1, §2.4): bảng `order_attachment` + nguồn tệp đăng ký vào kernel (route tải tệp / dọn tệp hỏi qua
// đây — kernel không import sales). Đọc tệp = đơn còn thấy được theo scope sales hiện hành + liên kết sống.
import type { AuthzContext } from '@appchat/shared';
import { can } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import type { RecordFileSource } from '../../../kernel/files/file-claims';
import type { AttachmentTable } from '../../files/association';
import { visibleOrder } from '../order-access';

export const orderAttachments: AttachmentTable = {
  type: 'order',
  async find(tx, id) {
    const r = await tx.orderAttachment.findUnique({ where: { id } });
    return r ? { ...r, parentId: r.orderId } : null;
  },
  live: (tx, parentId, fileId) => tx.orderAttachment.findFirst({ where: { orderId: parentId, fileId, detachedAt: null } }),
  async create(tx, r) {
    await tx.orderAttachment.create({ data: { id: r.id, orderId: r.parentId, fileId: r.fileId, createdBy: r.createdBy, createdAt: r.createdAt } });
  },
  async detach(tx, id, version, by, now) {
    return (await tx.orderAttachment.updateMany({ where: { id, version, detachedAt: null }, data: { detachedAt: now, detachedBy: by, version: { increment: 1 } } })).count;
  },
  holds: async (tx, fileId) => !!(await tx.orderAttachment.findFirst({ where: { fileId, detachedAt: null }, select: { id: true } })),
};

export const orderFileSource: RecordFileSource = {
  parentType: 'order',
  async canRead(tx: TenantTx, authz: AuthzContext, parentId: string, fileId: string) {
    if (!authz.isOwner && !can(authz, 'order.view')) return false;
    const ok = await visibleOrder(tx, authz, parentId).then(() => true, () => false);
    return ok && !!(await orderAttachments.live(tx, parentId, fileId));
  },
  holds: (tx, fileId) => orderAttachments.holds(tx, fileId),
};
