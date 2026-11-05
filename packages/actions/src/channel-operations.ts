// Huỷ lệnh thao tác kênh trên tin chưa gọi nhà cung cấp (TIP-014b B): chỉ lệnh thu hồi / cảm xúc gắn hội thoại, người ra lệnh (Owner huỷ
// được của người khác). Lệnh đã `dispatch_reserved` (đã / đang gọi kênh) → 409 — huỷ không hứa thu hồi được. Không có hành động "thử lại"
// cho gửi chưa rõ: gửi mới là thao tác riêng có xác nhận và cảnh báo trùng.
import { z } from 'zod';
import { defineAction } from './define';

export const channelOperationCancel = defineAction({
  id: 'channel_operation.cancel',
  module: 'inbox',
  title: 'actions.channel_operation.cancel.title',
  description:
    'Cancel a pending channel operation on a message (recall / reaction) that has not been sent to the provider yet. Once the provider call started it cannot be cancelled. Example: {"operation_id":"0190f000-0000-7000-8000-000000000001"}',
  input: z.object({ operation_id: z.string().uuid() }),
  output: z.object({ operation_id: z.string(), state: z.string() }),
  permission: 'inbox.reply',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['inbox'],
});
