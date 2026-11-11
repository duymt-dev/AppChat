// Action riêng của kênh (TIP-003c §2, §4.5): chốt kết quả đăng nhập đã xác thực (đúng lần đăng nhập / tài khoản đang `connecting`) và
// đánh dấu tài khoản không còn dùng được (hết hạn phiên / lỗi gửi bất thường) theo đúng thế hệ phiên — sự kiện trễ của thế hệ cũ không
// hạ kết nối mới. Thông tin đăng nhập chỉ đi qua tham chiếu đã mã hoá (staged), không bao giờ vào input / action log.
import { defineAction } from '../define';
import { systemInput, systemOutput } from './common';

export const channelSystemTransition = defineAction({
  id: 'channel.system_transition',
  module: 'channels',
  title: 'actions.channel.system_transition.title',
  description: 'Internal: commit a verified channel login attempt result, or mark a channel account unavailable for its current session generation.',
  input: systemInput(['commit_login_result', 'mark_expired', 'mark_send_errors']),
  output: systemOutput,
  permission: 'self',
  risk: 'write',
  agentGrantable: false,
  exposure: 'internal',
  invalidates: ['channels', 'settings'],
});
