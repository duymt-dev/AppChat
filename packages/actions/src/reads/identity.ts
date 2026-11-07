// Action đọc thành viên cho Trợ lý (TIP-023b R2 · DC-224 · SPEC A): tra người trong workspace theo tên / email để có user_id (giao việc,
// chuyển phụ trách, gán hội thoại). Giữ quyền màn Cài đặt › Thành viên (`members.manage`); chỉ thành viên đang hoạt động của workspace hiện
// tại; không trả lời mời / uỷ quyền / số điện thoại. Không agentGrantable: agent trực kênh không đọc danh bạ nội bộ.
import { z } from 'zod';
import { defineAction } from '../define';

export const memberSearch = defineAction({
  id: 'member.search',
  module: 'identity',
  title: 'actions.member.search.title',
  description: 'Find active team members of this workspace by name or email; returns user_id and role. Example: {"q":"Lan"}',
  input: z.object({ q: z.string().trim().max(80).optional(), role: z.string().max(40).optional(), limit: z.number().int().min(1).max(20).optional() }),
  output: z.object({ members: z.array(z.object({ user_id: z.string(), name: z.string(), email: z.string(), role: z.string() })) }),
  permission: 'members.manage',
  risk: 'read',
  agentGrantable: false,
  db: 'platform',
  invalidates: [],
});
