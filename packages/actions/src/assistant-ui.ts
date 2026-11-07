// Action phục vụ giao diện do Trợ lý ghép (TIP-023c, D55 / DC-227): đọc trạng thái kết nối cho khối `qr`, và tiếp tục run Trợ lý sau
// một kết quả bên ngoài (QR đã quét) mà SERVER tự kiểm chứng. Không cấp cho agent khách hàng (agentGrantable=false).
import { z } from 'zod';
import { channelStatusSchema } from '@appchat/shared';
import { defineAction } from './define';

export const channelStatus = defineAction({
  id: 'channel.status',
  module: 'channels',
  title: 'actions.channel.status.title',
  description:
    'Read the connection status of one channel account, including the current QR login attempt (waiting / scanned / connected / expired / failed). Never returns the QR image or credentials. Example: {"channel_account_id":"…"}',
  input: z.object({ channel_account_id: z.string().min(1) }),
  output: channelStatusSchema,
  permission: 'channels.manage',
  risk: 'read',
  agentGrantable: false,
  invalidates: [],
});

/**
 * Nội bộ (ẩn khỏi find_actions): trình duyệt báo "lần đăng nhập X của tài khoản Y đã xong" → server tự đọc trạng thái hiện hành của
 * tài khoản + attempt, ghi receipt duy nhất (run, node, attempt) rồi mới tiếp tục run. Không nhận `connected:true` từ client.
 */
export const assistantResume = defineAction({
  id: 'assistant.resume',
  module: 'ai',
  title: 'actions.assistant.resume.title',
  description: 'Internal: resume an assistant run after a verified external result (QR login). Not for model use.',
  input: z.object({ run_id: z.string().uuid(), node: z.string().max(40), channel_account_id: z.string().uuid(), attempt: z.string().min(8).max(80) }),
  output: z.object({ resumed: z.boolean(), status: z.string() }),
  permission: 'assistant.use',
  risk: 'read',
  agentGrantable: false,
  invalidates: ['assistant'],
});
