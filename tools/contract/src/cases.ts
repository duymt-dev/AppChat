// Ca contract FE ↔ BE: cùng request chạy qua mock transport (apps/web) và HTTP API thật (apps/api integration),
// rồi parse cùng zod output của Action Registry. TIP domain thêm ca vào đây khi nối httpTransport (D57).
export interface ContractCase {
  /** id action trong packages/actions */
  action: string;
  input: unknown;
  /** TIP sở hữu handler thật của action */
  tip: string;
  /** cần Idempotency-Key (send / money / *.create) */
  idempotent?: boolean;
}

export const CONTRACT_CASES: readonly ContractCase[] = [
  { action: 'notification.mark_read', input: { ids: 'all' }, tip: '003' },
  { action: 'onboarding.toggle_step', input: { step: 'channel', done: true }, tip: '011' },
  // TIP-012: kết nối Casso (mock FE: trường api_key) → Đăng ký quan tâm thẻ "Sắp có" → ngắt.
  { action: 'integration.connect', input: { provider: 'casso', fields: { api_key: 'ck_contract_1' } }, tip: '012' },
  { action: 'integration.register_interest', input: { provider: 'kiotviet' }, tip: '012' },
  { action: 'integration.disconnect', input: { provider: 'casso' }, tip: '012' },
  { action: 'notification.update_prefs', input: { events: { sla_warn: { desktop: true, email: true, mobile: false } }, dnd: { on: true, from: '22:00', to: '07:00' }, digest: 'weekly' }, tip: '006' },
];
