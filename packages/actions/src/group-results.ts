// Kết quả tạo nhóm từ worker kênh (TIP-023b SPEC D). Chỉ nguồn `system` của worker giữ phiên gọi được: không agentGrantable, ẩn khỏi
// find_actions / UI; executor từ chối mọi nguồn khác (handler kiểm thêm actor). Thành công → upsert hội thoại nhóm + thành viên theo
// (tài khoản, id nhóm) — tin nhóm về trước kết quả vẫn không sinh hai hội thoại.
import { z } from 'zod';
import { defineAction } from './define';

export const channelGroupResult = defineAction({
  id: 'channel.group_result',
  module: 'channels',
  title: 'actions.channel.group_result.title',
  description: 'System-only: record the outcome of a queued group creation (worker callback). Not callable by users, assistant or agents.',
  input: z.object({
    request_id: z.string().uuid(),
    outcome: z.enum(['succeeded', 'failed', 'unknown']),
    group_id: z.string().min(1).max(200).optional(),
    added: z.array(z.string().max(200)).max(49).optional(),
    failed: z.array(z.string().max(200)).max(49).optional(),
    error: z.string().max(200).optional(),
  }),
  output: z.object({ request_id: z.string(), status: z.string(), conversation_id: z.string().nullable() }),
  permission: 'self',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['inbox'],
});
