// Đăng ký media sản phẩm vào registry trung lập của kernel (TIP-027b §4.4) — CatalogModule gọi một dòng lúc khởi tạo.
import { registerAttachmentTarget } from '../../kernel/files/attachment-targets';
import { registerRecordFileSource } from '../../kernel/files/file-claims';
import { productAttachmentTarget, productFileSource } from './source';

export function registerProductMediaSources(): void {
  registerRecordFileSource(productFileSource);
  registerAttachmentTarget(productAttachmentTarget);
}
