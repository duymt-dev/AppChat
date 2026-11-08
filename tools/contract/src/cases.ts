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
  { action: 'integration.connect', input: { provider: 'casso', fields: { webhook_secret: 'ck_contract_1', account_number: '0071000123456' }, mode: 'sandbox' }, tip: '012' },
  { action: 'integration.register_interest', input: { provider: 'kiotviet' }, tip: '012' },
  // TIP-023c G3: metadata form + thăm dò connector (bản nháp, không lưu) — trước khi ngắt.
  { action: 'integration.form_schema', input: { provider: 'sepay' }, tip: '023c' },
  { action: 'integration.test', input: { provider: 'sepay', fields: { api_key: 'sk_contract', account_number: '0123' }, mode: 'sandbox' }, tip: '023c' },
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
  // TIP-014: thêm tài khoản Zalo cá nhân (QR đến qua worker). Quản lý theo channel_account_id → integration channels.
  { action: 'channel.zalo.start_login', input: { label: 'Zalo contract' }, tip: '014' },
  // TIP-016: Cài đặt › Thẻ + Câu trả lời mẫu (*.create → Idempotency-Key). Action hội thoại / tin cần hội thoại thật → integration inbox.
  { action: 'tag.create', input: { name: 'Contract thẻ', color: '#2563EB' }, tip: '016', idempotent: true },
  { action: 'canned_reply.create', input: { shortcut: '/contract', title: 'Contract', body: 'Dạ em chào {tên}', category: 'Chào hỏi' }, tip: '016', idempotent: true },
  // TIP-017: Cài đặt › Trợ lý AI website — bật widget (lần đầu tạo tài khoản webchat) + cấu hình.
  { action: 'webchat.update_widget', input: { enabled: true, greeting: 'Chào bạn 👋', prechat: true, handoff: 75 }, tip: '017' },
  // TIP-018: kênh Email — kiểm tra form + kết nối (HTTP: hộp thư giả `MAIL_TRANSPORT=fake`, mật khẩu đúng = app-password-e2e).
  { action: 'channel.test', input: { type: 'email', fields: { address: 'contract@spa.vn', imap_host: 'imap.fake.test', imap_port: '993', password: 'app-password-e2e' } }, tip: '018' },
  { action: 'channel.email.connect', input: { address: 'contract@spa.vn', fields: { imap_host: 'imap.fake.test', imap_port: '993', password: 'app-password-e2e' } }, tip: '018' },
  // TIP-019: Cài đặt › Mô hình AI — mức trong gói (workspace test gói Miễn phí: chỉ tiêu chuẩn) + hạn mức. run.cancel cần run thật → integration ai-runtime.
  { action: 'ai_settings.update', input: { default_tier: 'standard', tasks: { content: 'standard' }, budget: 300000, rate_limit: 8000 }, tip: '019' },
  // TIP-020: kho tri thức — thư mục (*.create → Idempotency-Key) + tài liệu văn bản (nạp ở worker ROLE=ai). Tệp / tìm / xoá theo id → integration kb.
  { action: 'kb.folder.create', input: { name: 'Contract thư mục' }, tip: '020', idempotent: true },
  { action: 'kb.add_source', input: { name: 'Contract chính sách', text: 'Đổi trả trong 7 ngày.', visibility: 'public', tags: ['Policy'] }, tip: '020' },
  // TIP-021: AI Agents — tạo bản nháp (*.create → Idempotency-Key; gói dùng thử ≥ 2 agent) + governance. Vòng đời / duyệt theo id → integration agents.
  { action: 'agent.create', input: { name: 'Contract Agent', role: 'cs', tools: ['ticket.create'], channels: ['webchat'], threshold: 75 }, tip: '021', idempotent: true },
  { action: 'governance.update', input: { keywords: ['cấm A'], filter: 'balanced', retention: '180' }, tip: '021' },
  { action: 'notification.update_prefs', input: { events: { sla_warn: { desktop: true, email: true, mobile: false } }, dnd: { on: true, from: '22:00', to: '07:00' }, digest: 'weekly' }, tip: '006' },
];
