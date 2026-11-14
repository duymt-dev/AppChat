// Action riêng của Hộp thư (TIP-003c §2, §4.7): gán agent của lượt, chuyển agent theo bước transfer_to_agent đã lưu, chuyển sang người
// (handoff nguyên tử). Thế hệ = ai_epoch của hội thoại — người tiếp quản / đổi chế độ giữa chừng làm trigger cũ thành no_effect.
import { defineAction } from '../define';
import { systemInput, systemOutput } from './common';

export const inboxSystemAgentTransition = defineAction({
  id: 'inbox.system_agent_transition',
  module: 'inbox',
  title: 'actions.inbox.system_agent_transition.title',
  description: 'Internal: bind the current turn agent, apply a recorded agent transfer, or hand a conversation over to a human for its current AI epoch.',
  input: systemInput(['assign_current_agent', 'transfer_agent', 'handoff']),
  output: systemOutput,
  permission: 'self',
  risk: 'write',
  agentGrantable: false,
  exposure: 'internal',
  invalidates: ['inbox'],
});
