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

/**
 * Đồng bộ danh bạ tài khoản kênh (TIP-014b D3): việc nền (202 job_accepted) lấy danh bạ theo trang có trần vào ảnh chụp RIÊNG của tài
 * khoản, hạn 24 giờ. Không tạo khách, không gửi lời mời / tin; nhập khách là thao tác tay riêng (`contact.import`, quyền crm.import).
 */
export const channelSyncContacts = defineAction({
  id: 'channel.sync_contacts',
  module: 'channels',
  title: 'actions.channel.sync_contacts.title',
  description:
    'Fetch the address book (friends) of a connected Zalo account into a private 24h snapshot (background job, 202 job_accepted). Never creates customers or sends invitations. Example: {"channel_account_id":"0190f000-0000-7000-8000-000000000001"}',
  input: z.object({ channel_account_id: z.string().uuid() }),
  output: z.object({ ok: z.boolean() }),
  permission: 'channels.manage',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['channels'],
});
