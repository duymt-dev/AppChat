// Tạo nhóm Zalo từ khách đã biết (TIP-023b SPEC D · DC-247). Người gọi cần inbox.manage + thấy được từng hội thoại nguồn; chỉ mời định
// danh khách đã nhắn với chính tài khoản kênh đó (không nhập số lạnh, không tìm người ngoài workspace). Handler chỉ lưu yêu cầu bền +
// outbox — kết quả `queued` KHÔNG có nghĩa nhóm đã được tạo; worker giữ phiên tạo thật rồi báo qua `channel.group_result`.
import { z } from 'zod';
import { defineAction } from './define';

export const conversationCreateGroup = defineAction({
  id: 'conversation.create_group',
  module: 'inbox',
  title: 'actions.conversation.create_group.title',
  description:
    'Ask the channel worker to create a new Zalo group on one connected account, inviting customers from existing 1-1 conversations on that same account (2–49). Returns a queued request, NOT a created group; follow request status. Example: {"channel_account_id":"0190…","name":"Khách VIP tháng 11","conversation_ids":["0190…","0190…"]}',
  input: z.object({
    channel_account_id: z.string().min(1),
    name: z.string().trim().min(1).max(100),
    conversation_ids: z.array(z.string().min(1)).min(1).max(49),
  }),
  output: z.object({ request_id: z.string(), status: z.literal('queued') }),
  permission: 'inbox.manage',
  // Mời người sang nhóm mới là gửi ra ngoài: Trợ lý xác nhận; agent / task luôn qua duyệt (không miễn theo hội thoại đang phục vụ).
  risk: 'send',
  agentGrantable: true,
  requiresConnector: 'zalo_personal',
  invalidates: ['inbox'],
});
