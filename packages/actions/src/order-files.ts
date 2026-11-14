// Tệp đính kèm đơn hàng (TIP-032d §1.2–1.3): gắn tệp vừa tải cho đúng đơn (`target_upload_handle` — tệp staging purpose
// `record_attachment` tải cho chính đơn này) hoặc sao chép tệp người dùng đưa cho Trợ lý (`assistant_artifact_ref` — sao chép có đồng ý,
// tệp MỚI riêng cho đơn), gỡ liên kết (không xoá tệp), liệt kê. Bộ tệp có revision riêng — không đổi tiền / trạng thái / version đơn.
// Không trả URL công khai; tải tệp qua route đã kiểm quyền đơn hiện hành.
import { z } from 'zod';
import { defineAction } from './define';
import { attachReceipt, attachmentList, attachmentSource, detachReceipt, uuid } from './commerce-file-schemas';

export const orderFileAttach = defineAction({
  id: 'order.file_attach',
  module: 'sales',
  title: 'actions.order.file_attach.title',
  description:
    'Attach a file to an order (supplementary document — never changes money / status). source.kind=target_upload_handle: a file the user uploaded FOR this order; source.kind=assistant_artifact_ref: copy a file the user gave the Assistant (artifact id + revision) into this order after the user confirms. if_revision = current attachment-set revision from order.files_list. Example: {"order_id":"0193…","source":{"kind":"target_upload_handle","file_id":"0193…"},"if_revision":0}',
  input: z.object({ order_id: uuid, source: attachmentSource, if_revision: z.number().int().min(0) }),
  output: attachReceipt,
  permission: 'order.manage',
  risk: 'write',
  agentGrantable: true,
  invalidates: ['orders'],
});

export const orderFileDetach = defineAction({
  id: 'order.file_detach',
  module: 'sales',
  title: 'actions.order.file_detach.title',
  description:
    'Remove a user attachment from an order (the stored file is kept for retention / cleanup rules — not deleted now). Generated documents cannot be removed. if_version = attachment version from order.files_list. Example: {"order_id":"0193…","attachment_id":"0193…","if_version":1}',
  input: z.object({ order_id: uuid, attachment_id: uuid, if_version: z.number().int().min(1) }),
  output: detachReceipt,
  permission: 'order.manage',
  risk: 'delete',
  agentGrantable: true,
  invalidates: ['orders'],
});

export const orderFilesList = defineAction({
  id: 'order.files_list',
  module: 'sales',
  title: 'actions.order.files_list.title',
  description: 'List files attached to an order (name, type, size, who / when) and the attachment-set revision. No download links — files open through the app. Example: {"order_id":"0193…"}',
  input: z.object({ order_id: uuid, limit: z.number().int().min(1).max(50).optional(), cursor: z.string().max(200).optional() }),
  output: attachmentList,
  permission: 'order.view',
  risk: 'read',
  agentGrantable: true,
  invalidates: [],
});
