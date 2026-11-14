// Action riêng của support (TIP-003c §2, §4.4): tin khách vào hội thoại có ticket (chép bình luận / tiếp tục SLA / tự mở lại D52 / CSAT),
// phản hồi đầu (dừng FRT), cảnh báo 80% TTR, quá hạn FRT / TTR. Nguồn bắt buộc là tin nhắn / event đã lưu hoặc hạn hiện tại; nội dung tin
// không chép vào trigger / audit (handler đọc lại tin dưới guard privacy hiện tại).
import { defineAction } from '../define';
import { systemInput, systemOutput } from './common';

export const ticketSystemTransition = defineAction({
  id: 'ticket.system_transition',
  module: 'support',
  title: 'actions.ticket.system_transition.title',
  description: 'Internal: apply one customer message to a conversation ticket, record the first response, warn at 80% of TTR, or mark an FRT / TTR breach once.',
  input: systemInput(['customer_message', 'first_response', 'sla_warning', 'frt_breach', 'ttr_breach']),
  output: systemOutput,
  permission: 'self',
  risk: 'write',
  agentGrantable: false,
  exposure: 'internal',
  invalidates: ['support'],
});
