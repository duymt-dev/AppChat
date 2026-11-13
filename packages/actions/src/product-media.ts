// Ảnh / tài liệu riêng tư của sản phẩm (TIP-027b §1.3): gắn tệp vừa tải cho đúng sản phẩm (`target_upload_handle` — staging purpose
// `record_attachment` tải cho chính sản phẩm này) hoặc sao chép tệp người dùng đưa cho Trợ lý (`assistant_artifact_ref` — có đồng ý, tệp MỚI
// riêng cho sản phẩm), gỡ (không xoá tệp), sắp xếp lại (hoán vị ĐỦ id sống của một loại), đặt ảnh chính, liệt kê. Bộ media có version riêng
// (`if_version`) — không đổi giá / tồn / version sản phẩm. Ghi theo quyền soạn sản phẩm (catalog.manage, không cấp cho agent — như
// product.create / update). Không trả URL; tải tệp qua route đã kiểm quyền sản phẩm hiện hành.
import { z } from 'zod';
import { defineAction } from './define';
import { attachmentSource, uuid } from './commerce-file-schemas';

const kind = z.enum(['image', 'document']);
const version = z.number().int().min(0);

const productMediaRow = z.object({
  media_id: z.string(),
  file_id: z.string(),
  kind,
  name: z.string(),
  mime: z.string(),
  bytes: z.number().int(),
  position: z.number().int(),
  is_primary: z.boolean(),
  version: z.number().int(),
  created_at: z.string(),
  /** Tệp gốc còn đọc được (mất bytes → false, không bịa đường dẫn). */
  available: z.boolean(),
});
const mediaList = z.object({ items: z.array(productMediaRow), version: z.number().int(), can_edit: z.boolean(), limits: z.object({ image: z.number().int(), document: z.number().int() }) });
const receipt = z.object({ media_id: z.string(), version: z.number().int(), primary_id: z.string().nullable() });

export const productMediaAttach = defineAction({
  id: 'product.media_attach',
  module: 'catalog',
  title: 'actions.product.media_attach.title',
  description:
    'Attach an image (PNG / JPEG / WEBP) or document to a product. source.kind=target_upload_handle: a file uploaded FOR this product; source.kind=assistant_artifact_ref: copy a file the user gave the Assistant into this product after the user confirms. The first image becomes primary. if_version = media version from product.media_list. Example: {"product_id":"0193…","source":{"kind":"target_upload_handle","file_id":"0193…"},"if_version":0}',
  input: z.object({ product_id: uuid, source: attachmentSource, if_version: version }),
  output: receipt.extend({ file_id: z.string(), kind, reused: z.boolean() }),
  permission: 'catalog.manage',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['catalog'],
});

export const productMediaDetach = defineAction({
  id: 'product.media_detach',
  module: 'catalog',
  title: 'actions.product.media_detach.title',
  description: 'Remove an image / document from a product (the stored file is kept for retention / cleanup rules). Removing the primary image promotes the next image. Example: {"product_id":"0193…","media_id":"0193…","if_version":2}',
  input: z.object({ product_id: uuid, media_id: uuid, if_version: version }),
  output: receipt,
  permission: 'catalog.manage',
  risk: 'delete',
  agentGrantable: false,
  invalidates: ['catalog'],
});

export const productMediaReorder = defineAction({
  id: 'product.media_reorder',
  module: 'catalog',
  title: 'actions.product.media_reorder.title',
  description: 'Reorder the images (or documents) of a product. media_ids must be the COMPLETE list of current ids of that kind in the new order. Example: {"product_id":"0193…","kind":"image","media_ids":["0193…","0193…"],"if_version":3}',
  input: z.object({ product_id: uuid, kind, media_ids: z.array(uuid).min(1).max(20), if_version: version }),
  output: z.object({ version: z.number().int() }),
  permission: 'catalog.manage',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['catalog'],
});

export const productMediaSetPrimary = defineAction({
  id: 'product.media_set_primary',
  module: 'catalog',
  title: 'actions.product.media_set_primary.title',
  description: 'Make an image the primary image of a product (documents cannot be primary). Example: {"product_id":"0193…","media_id":"0193…","if_version":3}',
  input: z.object({ product_id: uuid, media_id: uuid, if_version: version }),
  output: receipt,
  permission: 'catalog.manage',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['catalog'],
});

export const productMediaList = defineAction({
  id: 'product.media_list',
  module: 'catalog',
  title: 'actions.product.media_list.title',
  description: 'List the images and documents of a product (name, type, size, order, primary) and the media version. No download links — files open through the app. Example: {"product_id":"0193…"}',
  input: z.object({ product_id: uuid, kind: kind.optional() }),
  output: mediaList,
  permission: 'catalog.view',
  risk: 'read',
  agentGrantable: true,
  invalidates: [],
});
