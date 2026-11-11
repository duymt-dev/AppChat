// Action riêng của AI (TIP-003c §2, §4.7): hết hạn yêu cầu duyệt đúng hạn hiện hành (019b — job trễ hiện có là bộ hẹn, không scheduler
// thứ hai). Chuyển người / kết thúc run sau commit vẫn do hook theo loại run của 019b / 022b.
import { defineAction } from '../define';
import { systemInput, systemOutput } from './common';

export const approvalSystemExpire = defineAction({
  id: 'approval.system_expire',
  module: 'ai',
  title: 'actions.approval.system_expire.title',
  description: 'Internal: expire a pending approval request whose current deadline has passed.',
  input: systemInput(['expire']),
  output: systemOutput,
  permission: 'self',
  risk: 'write',
  agentGrantable: false,
  exposure: 'internal',
  invalidates: ['approvals', 'action-logs', 'nav'],
});
