// Bạn bè kênh Zalo (TIP-014b E — DC nới DC-247). Chỉ nhân viên bấm trên UI: không cho agent (agentGrantable false), handler từ chối nguồn
// khác `ui` (Trợ lý / task / API). Một người mỗi lệnh (không hàng loạt). Gửi lời mời: chỉ định danh đã biết, trần 20 / ngày / tài khoản,
// có cảnh báo rủi ro. Tra SĐT: một số mỗi lần, trần 30 / ngày, kết quả tạm 24 giờ, có nhật ký; "Lưu thành khách" là contact.create riêng.
import { z } from 'zod';
import { defineAction } from './define';

const target = z.object({ channel_account_id: z.string().uuid(), external_id: z.string().regex(/^[0-9]{1,20}$/) });
const accepted = z.object({ ok: z.boolean() });

export const channelFriendAccept = defineAction({
  id: 'channel.friend.accept',
  module: 'inbox',
  title: 'actions.channel.friend.accept.title',
  description: 'Accept one incoming Zalo friend request (staff click only — not for AI). Example: {"channel_account_id":"0190f000-0000-7000-8000-000000000001","external_id":"7300000001"}',
  input: target,
  output: accepted,
  permission: 'inbox.reply',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['inbox'],
});

export const channelFriendReject = defineAction({
  id: 'channel.friend.reject',
  module: 'inbox',
  title: 'actions.channel.friend.reject.title',
  description: 'Reject one incoming Zalo friend request (staff click only — not for AI). Example: {"channel_account_id":"0190f000-0000-7000-8000-000000000001","external_id":"7300000001"}',
  input: target,
  output: accepted,
  permission: 'inbox.reply',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['inbox'],
});

export const channelFriendSend = defineAction({
  id: 'channel.friend.send',
  module: 'inbox',
  title: 'actions.channel.friend.send.title',
  description:
    'Send ONE Zalo friend request to a known person (already chatted with the account, a group member, or a fresh phone lookup). Staff click only, max 20/day per account, never bulk. Example: {"channel_account_id":"0190f000-0000-7000-8000-000000000001","external_id":"7300000001","message":"Chào anh"}',
  input: target.extend({ message: z.string().max(150).default('') }),
  output: accepted,
  permission: 'inbox.manage',
  risk: 'send',
  agentGrantable: false,
  invalidates: ['inbox'],
});

export const channelFriendUndo = defineAction({
  id: 'channel.friend.undo',
  module: 'inbox',
  title: 'actions.channel.friend.undo.title',
  description: 'Withdraw a pending outgoing Zalo friend request (staff click only). Example: {"channel_account_id":"0190f000-0000-7000-8000-000000000001","external_id":"7300000001"}',
  input: target,
  output: accepted,
  permission: 'inbox.manage',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['inbox'],
});

export const channelLookupUser = defineAction({
  id: 'channel.lookup_user',
  module: 'inbox',
  title: 'actions.channel.lookup_user.title',
  description:
    'Look up ONE phone number on a Zalo account (staff click only, max 30/day per account, result kept 24h, audited, never saved as a customer automatically). Example: {"channel_account_id":"0190f000-0000-7000-8000-000000000001","phone":"0909123456"}',
  input: z.object({ channel_account_id: z.string().uuid(), phone: z.string().min(9).max(20) }),
  output: accepted,
  permission: 'inbox.manage',
  // Ghi dòng nhật ký tra + tính vào trần / ngày → write (không phải đọc thuần).
  risk: 'write',
  agentGrantable: false,
  invalidates: ['inbox'],
});
