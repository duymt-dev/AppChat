// Parity lối vào Trợ lý theo bản ghi (TIP-023g, PD-027): ⚡ / ✦ trên dòng mở drawer Trợ lý của module gắn bản ghi — prototype chỉ báo
// toast "AI Agent đang xử lý…" (L9322) / mở khung gợi ý cố định (L9316), không có trạng thái gắn bản ghi. Đo đầu drawer (tiêu đề + phụ
// đề giữ nguyên prototype) và che thân drawer (khung gắn bản ghi mới). Tab AI của Sản phẩm: đầu drawer so như `products:detail`, thân tab
// AI (khung đề xuất combo / chiến dịch) che có lý do.
import type { Page } from '@playwright/test';
import type { ParityEntry } from '../parity.manifest';
import { protoOverrideVals } from '../protoState';

const BODY = 'PD-027 (TIP-023g): thân drawer = khung gắn bản ghi (ý định + việc + luồng) — prototype không có trạng thái gắn bản ghi';

export const RECORD_AI: ParityEntry[] = [
  {
    id: 'record-ai:quote-bound',
    route: '/quotes',
    protoStorage: { ac_module: 'quotes' },
    proto: (p: Page) => p.locator('.aibtn', { hasText: 'Trợ lý AI' }).first().click(),
    app: async (p: Page) => {
      await p.locator('[data-quote="q_2039"]').first().getByRole('button', { name: 'Giao AI Agent xử lý ngay' }).click();
      await p.getByTestId('q-rai').waitFor();
    },
    appWait: '[data-quote]',
    clip: { x: 1100, y: 0, width: 340, height: 900 },
    mask: [{ x: 1100, y: 72, width: 340, height: 828, reason: BODY }],
  },
  {
    id: 'record-ai:product-tab',
    route: '/products',
    protoStorage: { ac_module: 'products' },
    proto: async (p: Page) => {
      await p.locator('.cmpwrap .row').first().locator('div[style*="cursor: pointer"]').first().click();
      await protoOverrideVals(p, { pdDetailOn: true });
    },
    app: async (p: Page) => {
      await p.locator('[data-product]').first().click();
      await p.getByTestId('pd-drawer').getByRole('tab', { name: 'AI' }).click();
      await p.getByTestId('pd-rai').waitFor();
    },
    appWait: '[data-product]',
    clip: { x: 1048, y: 0, width: 392, height: 900 },
    mask: [{ x: 1048, y: 200, width: 392, height: 700, reason: 'PD-027 (TIP-023g): tab AI sản phẩm = khung đề xuất combo / chiến dịch (prototype tab Tổng quan)' }],
  },
];
