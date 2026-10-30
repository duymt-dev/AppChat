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
  // TIP-013: Cài đặt › Tổng quan / Ngôn ngữ (không đụng business_profile — workspace test chưa khai báo) + Giờ làm việc.
  { action: 'workspace.update', input: { website: 'https://contract.vn', support_phone: '0281234567', timezone: 'Asia/Ho_Chi_Minh', date_format: 'DD/MM/YYYY' }, tip: '013' },
  {
    action: 'working_hours.update',
    input: { days: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, on: day < 5, from: '08:30', to: '17:30' })), pause_sla: true },
    tip: '013',
  },
  // TIP-010: mua gói credit (money → Idempotency-Key). report / cancel cần invoice_id thật → integration billing-payments.
  { action: 'billing.create_invoice', input: { kind: 'credit', item: 'credit_1000' }, tip: '010', idempotent: true },
  // TIP-015: tạo khách (*.create → Idempotency-Key), trường tuỳ biến, bố cục Hồ sơ 360°. Ghi theo contact_id → integration crm.
  { action: 'contact.create', input: { full_name: 'Khách Contract', phone: '0939111222', city: 'TP.HCM' }, tip: '015', idempotent: true },
  { action: 'custom_field.define', input: { entity: 'contact', label: 'Ghi chú contract', type: 'text' }, tip: '015' },
  { action: 'profile_layout.assign_role', input: { role: 'cs', layout_id: 'pl_cskh' }, tip: '015' },
  { action: 'notification.update_prefs', input: { events: { sla_warn: { desktop: true, email: true, mobile: false } }, dnd: { on: true, from: '22:00', to: '07:00' }, digest: 'weekly' }, tip: '006' },
];
