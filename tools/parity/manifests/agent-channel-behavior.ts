// Parity hành vi agent trực kênh (TIP-022b, PD-020): Builder › Phân luồng — "Khung giờ hoạt động" khi chọn Tuỳ chỉnh mở lịch tuần có cấu
// trúc (prototype L2715 chỉ có select, không có trình sửa lịch) → mask vùng lịch tuần; phần trên giữ so pixel. Hộp thư "Cần người" — thẻ
// bàn giao giữ so khung như `inbox:handoff`; tóm tắt bàn giao có cấu trúc là khối mới dưới thẻ (prototype không có) → so riêng khung thẻ.
import type { ParityEntry } from '../parity.manifest';

export const AGENT_CHANNEL_BEHAVIOR: ParityEntry[] = [
  {
    id: 'agent-channel-behavior:builder-hours',
    route: '/agents/new',
    protoStorage: { ac_module: 'agents' },
    proto: (p) => p.locator('.btnp', { hasText: 'Tạo thủ công' }).click(),
    app: async (p) => {
      await p.addStyleTag({ content: '[data-testid="agb-col"] { margin: 0 !important; }' });
      await p.getByTestId('agb-hours').selectOption('office');
    },
    appWait: '[data-testid="agb-name"]',
    mask: [
      { x: 20, y: 255, width: 340, height: 105, reason: 'D29 mức AI thay tên model' },
      { x: 20, y: 805, width: 680, height: 95, reason: 'prototype-parity §6 Kênh — channel registry (Zalo cá nhân / Web chat / Email)' },
    ],
  },
  {
    id: 'agent-channel-behavior:handoff-summary',
    route: '/inbox',
    protoStorage: { ac_module: 'inbox' },
    proto: (p) =>
      p
        .locator('.appscroll', { hasText: 'Claude Cowork gợi ý trả lời' })
        .last()
        .evaluate((n) => n.scrollTo(0, n.scrollHeight)),
    app: async (p) => {
      await p.locator('[data-conv="c_hieu"] button').first().click();
      await p.getByTestId('handoff-summary').waitFor();
    },
    clipTo: {
      proto: 'div[style*="linear-gradient(135deg, rgb(236, 253, 245)"]',
      app: '[data-testid="handoff-banner"]',
    },
    // Cùng mask `inbox:handoff` — khung thẻ không đổi khi có tóm tắt bàn giao (khối tóm tắt nằm NGOÀI thẻ, không đẩy lệch thẻ).
    mask: [
      { x: 44, y: 8, width: 600, height: 26, reason: 'handoff không có trong prototype — tiêu đề / nhãn khác nội dung' },
      { x: 24, y: 62, width: 616, height: 52, reason: 'handoff không có trong prototype — bản nháp AI khác nội dung' },
      { x: 24, y: 136, width: 260, height: 36, reason: 'handoff không có trong prototype — nút Nhận xử lý / Dùng bản nháp' },
    ],
  },
];
