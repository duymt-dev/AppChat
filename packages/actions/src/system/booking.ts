// Action riêng của booking / hợp đồng (TIP-003c §2): lịch chờ hết giữ chỗ / nhắc hẹn theo mốc; hợp đồng — link ký hết hạn (không còn
// token sống thay thế), hết hạn sau ngày kết thúc, nhắc gia hạn T-30. Luật giữ ở domain (APPOINTMENT_FLOW, dueReminder, CONTRACT_FLOW).
import { defineAction } from '../define';
import { systemInput, systemOutput } from './common';

const common = { output: systemOutput, permission: 'self' as const, agentGrantable: false, exposure: 'internal' as const };

export const appointmentSystemTransition = defineAction({
  ...common,
  id: 'appointment.system_transition',
  module: 'booking',
  title: 'actions.appointment.system_transition.title',
  description: 'Internal: expire an unconfirmed appointment hold of the current hold generation, or send the current start-time reminder milestone once.',
  input: systemInput(['expire_hold', 'remind']),
  risk: 'send',
  invalidates: ['booking'],
});

export const contractSystemTransition = defineAction({
  ...common,
  id: 'contract.system_transition',
  module: 'sales',
  title: 'actions.contract.system_transition.title',
  description: 'Internal: decline a contract whose sign link expired with no live replacement, expire a signed contract after its end date, or send the T-30 renewal notice once.',
  input: systemInput(['expire_link', 'expire_contract', 'renewal_notice']),
  risk: 'send',
  invalidates: ['sales'],
});
