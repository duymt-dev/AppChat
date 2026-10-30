// Policy nguồn × rủi ro (Blueprint §3.3). Governance cứng (> 20M, giảm giá > 5%, hoàn tiền…) do handler domain
// ném qua `policyOverride` của preview — ngoài phạm vi bảng này.
import type { Risk } from '@appchat/actions';
import type { ActionPolicyInput, ActionSource } from './action-context';

export type PolicyDecision = 'run' | 'preview' | 'approval' | 'forbidden';

const TABLE: Record<ActionSource, Record<Risk, PolicyDecision>> = {
  ui: { read: 'run', write: 'run', send: 'run', money: 'run', delete: 'run', config: 'run' },
  api: { read: 'run', write: 'run', send: 'run', money: 'run', delete: 'run', config: 'run' },
  system: { read: 'run', write: 'run', send: 'run', money: 'run', delete: 'run', config: 'run' },
  assistant: { read: 'run', write: 'preview', send: 'preview', money: 'preview', delete: 'preview', config: 'preview' },
  agent: { read: 'run', write: 'run', send: 'approval', money: 'approval', delete: 'forbidden', config: 'forbidden' },
  task: { read: 'run', write: 'run', send: 'approval', money: 'approval', delete: 'approval', config: 'forbidden' },
};

export function decidePolicy({ source, risk, bulk }: ActionPolicyInput): PolicyDecision {
  const base = TABLE[source][risk] as PolicyDecision;
  // bulk luôn preview kèm số bản ghi, kể cả ui (§3.3) — trừ khi nguồn đã bị cấm / phải duyệt.
  if (bulk && base === 'run' && risk !== 'read' && source !== 'system') return 'preview';
  return base;
}

/** Idempotency-Key bắt buộc: risk send / money và lệnh tạo (response-envelope §7). */
export function requiresIdempotencyKey(actionId: string, risk: Risk): boolean {
  return risk === 'send' || risk === 'money' || /\.create$/.test(actionId);
}
