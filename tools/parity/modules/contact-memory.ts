// Parity Hồ sơ 360° tab AI (TIP-015b): khối "AI tóm tắt theo phạm vi" + "AI ghi nhớ" (MemoryPanel) nằm đầu tab AI, trên "Hành vi / Tín hiệu
// / Next best action" của prototype (L2470–2520) — prototype không có khối trí nhớ (REQ-D10b / DEF-015-4) → mask vùng hai thẻ mới (PD-011).
// Phần dưới tab giữ so pixel với prototype.
import type { ParityEntry } from '../parity.manifest';

const PANEL = { x: 1048, y: 0, width: 392, height: 900 };

export const CONTACT_MEMORY: ParityEntry[] = [
  {
    id: 'contact-memory:360-ai',
    route: '/customers',
    protoStorage: { ac_module: 'customers' },
    proto: async (p) => {
      await p.locator('.row', { hasText: 'Nguyễn Thị Lan' }).first().click();
      await p.locator('button', { hasText: /^AI$/ }).last().click();
    },
    app: async (p) => {
      await p.locator('[data-contact="ct_lan"]').first().click();
      await p.getByTestId('crm-360').getByRole('tab', { name: 'AI' }).click();
      await p.getByTestId('p360-memory').waitFor();
    },
    clip: PANEL,
    mask: [{ x: 1048, y: 120, width: 392, height: 330, reason: 'PD-011 khối AI tóm tắt theo phạm vi + AI ghi nhớ (TIP-015b) — prototype không có' }],
  },
];
