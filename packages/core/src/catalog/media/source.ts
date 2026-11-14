// Nguồn tệp + đích tải lên của sản phẩm (TIP-027b §1.6, §4.4): đăng ký vào registry trung lập của kernel (kernel không import catalog). Tải
// tệp đã giành cho sản phẩm = catalog.view hiện hành + sản phẩm còn sống + liên kết sống (người tải / Owner không còn là đường tắt). Tải lên
// cho sản phẩm = catalog.manage + sản phẩm sống, hồ sơ kiểm `product` (ảnh có giới hạn điểm ảnh + tài liệu).
import { AppError, can } from '@appchat/shared';
import type { RecordFileSource } from '../../kernel/files/file-claims';
import type { AttachmentTarget } from '../../kernel/files/attachment-targets';
import { holdsFile, liveByFile, lockProduct } from './repository';
import { PRODUCT } from './attach';

export const productFileSource: RecordFileSource = {
  parentType: PRODUCT,
  async canRead(tx, authz, parentId, fileId) {
    if (!authz.isOwner && !can(authz, 'catalog.view')) return false;
    const p = await tx.product.findUnique({ where: { id: parentId }, select: { deletedAt: true } });
    return !!p && !p.deletedAt && !!(await liveByFile(tx, parentId, fileId));
  },
  holds: holdsFile,
};

export const productAttachmentTarget: AttachmentTarget = {
  parentType: PRODUCT,
  profile: 'product',
  async assertWritable(tx, authz, id) {
    if (!authz.isOwner && !can(authz, 'catalog.manage')) throw new AppError('FORBIDDEN', 403, { permission: 'catalog.manage' });
    await lockProduct(tx, id);
  },
};
