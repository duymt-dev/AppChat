// Action đọc tài khoản kênh cho Trợ lý (TIP-023b R2 · DC-224 · SPEC A): tra tài khoản Zalo / email / web chat theo tên để có
// channel_account_id. Giữ quyền màn Cài đặt › Kênh (`channels.manage`); không trả thông tin đăng nhập / cookie / mật khẩu ứng dụng.
import { z } from 'zod';
import { defineAction } from '../define';

export const channelSearch = defineAction({
  id: 'channel.search',
  module: 'channels',
  title: 'actions.channel.search.title',
  description: 'Find connected channel accounts (Zalo personal, email, web chat) by name or type; returns channel_account_id and status. Example: {"type":"zalo_personal"}',
  input: z.object({ q: z.string().trim().max(80).optional(), type: z.enum(['zalo_personal', 'email', 'webchat']).optional(), limit: z.number().int().min(1).max(20).optional() }),
  output: z.object({ channels: z.array(z.object({ id: z.string(), type: z.string(), name: z.string(), status: z.string(), paused: z.boolean() })) }),
  permission: 'channels.manage',
  risk: 'read',
  agentGrantable: false,
  invalidates: [],
});

export const cannedReplySearch = defineAction({
  id: 'canned_reply.search',
  module: 'inbox',
  title: 'actions.canned_reply.search.title',
  description: 'Find saved quick replies by shortcut or title; returns reply_id and the reply text. Example: {"q":"giờ mở cửa"}',
  input: z.object({ q: z.string().trim().max(80).optional(), limit: z.number().int().min(1).max(20).optional() }),
  output: z.object({ replies: z.array(z.object({ id: z.string(), shortcut: z.string(), title: z.string(), body: z.string(), category: z.string() })) }),
  permission: 'inbox.reply',
  risk: 'read',
  agentGrantable: true,
  invalidates: [],
});
