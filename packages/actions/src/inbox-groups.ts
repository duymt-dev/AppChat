// Quản lý nhóm Zalo từ Hộp thư (TIP-025b §A). Chính sách AI nhóm là cài đặt AppChat (ghi ngay, CAS theo revision). Thêm thành viên / đổi
// tên + link / tắt thông báo / làm mới là LỆNH bền gọi kênh qua worker giữ phiên: kết quả `queued` KHÔNG có nghĩa đã xong — theo dõi trạng
// thái lệnh. Không cho agent (agentGrantable false); Trợ lý (người ra lệnh) dùng được qua xem trước. Tắt thông báo = tắt cho TÀI KHOẢN
// Zalo đang kết nối, không phải cho người dùng AppChat. Ghim hội thoại trong AppChat dùng conversation.pin (không phải ghim nhóm phía kênh).
import { z } from 'zod';
import { defineAction } from './define';

const convId = z.string().min(1);
const queued = z.object({ command_id: z.string(), status: z.literal('queued') });

export const groupSetAiPolicy = defineAction({
  id: 'group.set_ai_policy',
  module: 'inbox',
  title: 'actions.group.set_ai_policy.title',
  description:
    'Set when the AI agent may answer in a group conversation: "mention" (only when @-mentioned), "auto" (any message), "off". Needs the current policy_version from group state; a concurrent change returns 409. Does not change the conversation AI mode. Example: {"conversation_id":"0190…","policy":"mention","if_version":3}',
  input: z.object({ conversation_id: convId, policy: z.enum(['mention', 'auto', 'off']), if_version: z.number().int().min(0) }),
  output: z.object({ policy: z.enum(['mention', 'auto', 'off']), policy_version: z.number().int() }),
  permission: 'inbox.reply',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['inbox'],
});

export const groupAddMembers = defineAction({
  id: 'group.add_members',
  module: 'inbox',
  title: 'actions.group.add_members.title',
  description:
    'Queue adding known customers (from existing 1-1 conversations on the SAME connected account, max 50) to a Zalo group. Returns a queued command, NOT added members; per-member results arrive on the command status. Example: {"conversation_id":"0190…","member_conversation_ids":["0190…"]}',
  input: z.object({ conversation_id: convId, member_conversation_ids: z.array(z.string().min(1)).min(1).max(50) }),
  output: queued,
  permission: 'inbox.manage',
  risk: 'send',
  agentGrantable: false,
  requiresConnector: 'zalo_personal',
  invalidates: ['inbox'],
});

export const groupUpdate = defineAction({
  id: 'group.update',
  module: 'inbox',
  title: 'actions.group.update.title',
  description:
    'Queue renaming a Zalo group and/or turning its invite link on or off. Only these two settings; expected_version (from group state) must match the provider snapshot. Example: {"conversation_id":"0190…","name":"Khách VIP 2026","expected_version":"7"}',
  input: z
    .object({ conversation_id: convId, name: z.string().trim().min(1).max(100).optional(), invite_link_enabled: z.boolean().optional(), expected_version: z.string().min(1).max(40) })
    .refine((v) => v.name !== undefined || v.invite_link_enabled !== undefined, { message: 'empty', path: ['name'] }),
  output: queued,
  permission: 'inbox.manage',
  risk: 'send',
  agentGrantable: false,
  requiresConnector: 'zalo_personal',
  invalidates: ['inbox'],
});

export const groupSetMute = defineAction({
  id: 'group.set_mute',
  module: 'inbox',
  title: 'actions.group.set_mute.title',
  description: 'Queue muting/unmuting notifications of the connected Zalo ACCOUNT for this group (does not mute AppChat users). Example: {"conversation_id":"0190…","muted":true}',
  input: z.object({ conversation_id: convId, muted: z.boolean() }),
  output: queued,
  permission: 'inbox.manage',
  risk: 'send',
  agentGrantable: false,
  requiresConnector: 'zalo_personal',
  invalidates: ['inbox'],
});

export const groupCopyLink = defineAction({
  id: 'group.copy_link',
  module: 'inbox',
  title: 'actions.group.copy_link.title',
  description:
    'Queue reading the current invite link of a Zalo group so the requesting person can copy it (only that person sees it, for 10 minutes; never enables the link). UI only — not for AI. Example: {"conversation_id":"0190…"}',
  input: z.object({ conversation_id: convId }),
  output: queued,
  permission: 'inbox.manage',
  risk: 'read',
  agentGrantable: false,
  requiresConnector: 'zalo_personal',
  invalidates: [],
});

export const groupRefresh = defineAction({
  id: 'group.refresh',
  module: 'inbox',
  title: 'actions.group.refresh.title',
  description: 'Queue re-reading the group from the provider (name, total, account role, link on/off, version). One open refresh per group. Example: {"conversation_id":"0190…"}',
  input: z.object({ conversation_id: convId }),
  output: queued,
  permission: 'inbox.view',
  risk: 'write',
  agentGrantable: false,
  requiresConnector: 'zalo_personal',
  invalidates: ['inbox'],
});
