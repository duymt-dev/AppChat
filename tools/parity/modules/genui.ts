// Parity Trợ lý theo màn (TIP-023c G2, REQ-E06): drawer "Trợ lý AI · [module]" ở trạng thái mở chưa hỏi — khung prototype giữ nguyên,
// ô hỏi / nút "Phân tích nhanh" gửi lượt thật (cây GenUI gọn hiện sau khi hỏi — không so pixel, kiểm ở e2e screen-assistant).
// customers:ai / marketing:ai / inbox:ai-panel / agents:ai-create / shell:assistant-dock đo ở dòng của màn đó (parity.manifest.ts).
import type { ParityEntry } from '../parity.manifest';

const DRAWER = { x: 1048, y: 0, width: 392, height: 900 };

const drawer = (id: string, module: string, title: string, openId: string, wait: string): ParityEntry => ({
  id,
  route: `/${module}`,
  protoStorage: { ac_module: module },
  proto: (p) => p.locator(`[title="Trợ lý AI · ${title}"]`).first().click(),
  app: (p) => p.locator(`[data-testid="${openId}"]`).click(),
  appWait: wait,
  clip: DRAWER,
});

export const GENUI_DRAWERS: ParityEntry[] = [
  drawer('quotes:ai', 'quotes', 'Báo giá', 'q-ai-open', '[data-quote]'),
  drawer('contracts:ai', 'contracts', 'Hợp đồng', 'ct-ai-open', '[data-contract]'),
  drawer('orders:ai', 'orders', 'Đơn hàng', 'od-ai-open', '[data-order]'),
  drawer('calendar:ai', 'calendar', 'Lịch hẹn', 'cal-ai-open', '[data-appt]'),
  drawer('tickets:ai', 'tickets', 'Tickets', 'tk-ai-open', '[data-ticket]'),
];
