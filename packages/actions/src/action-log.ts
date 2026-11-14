// action_log.add_correction (REQ-E09c, DC-292, TIP-003e §4): hành động đã gửi ra ngoài (risk `send`) không hoàn tác được — chỉ ghi đính
// chính. Không tạo permission mới: handler kiểm người gọi có ĐÚNG permission của action gốc trong registry (vd `quote.send`) + scope tới
// bản ghi gốc; định nghĩa ở đây là `self` để executor không chặn trước bằng một permission chung. Mỗi lần ghi THÊM một mục vào mảng
// `correction[]` (không ghi đè). Tuỳ chọn tạo bản nháp tin đính chính — không tự gửi.
import { z } from 'zod';
import { defineAction } from './define';

export const actionLogAddCorrection = defineAction({
  id: 'action_log.add_correction',
  module: 'settings',
  title: 'actions.action_log.add_correction.title',
  description:
    'Append a correction note to a sent action (risk send — cannot be undone) in the action log; requires the original action permission and access to its record. Example: {"action_log_id":"0190f000-0000-7000-8000-000000000001","note":"Giá đúng là 1.200.000đ"}',
  input: z.object({
    // Handler kiểm định dạng (id lạ → 404 như không có — không lộ tồn tại qua 422).
    action_log_id: z.string().min(1).max(64),
    note: z.string().trim().min(1).max(1000),
  }),
  output: z.object({ action_log_id: z.string(), corrections: z.number().int() }),
  permission: 'self',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['action-logs'],
});
