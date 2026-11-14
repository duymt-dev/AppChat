// TIP-038 pha 3 (AC10): nút Xuất của 4 danh sách gọi `<list>.export` với bộ lọc đang xem → tải tệp thật (không còn toast giả); thông báo
// số dòng đã xuất; nút bận trong lúc xuất. Mock: ≤ 50 dòng có link ngay (luồng nền > 50: test mock + integration).
import { expect, test } from '@playwright/test';
import { isMobile } from './support/mobile';

const LISTS = [
  ['/quotes', 'q-export', /^bao-gia-\d{4}-\d{2}-\d{2}\.xlsx$/],
  ['/orders', 'od-export', /^don-hang-\d{4}-\d{2}-\d{2}\.xlsx$/],
  ['/contracts', 'ct-export', /^hop-dong-\d{4}-\d{2}-\d{2}\.xlsx$/],
  ['/tickets', 'tk-export', /^ticket-\d{4}-\d{2}-\d{2}\.xlsx$/],
] as const;

test.describe('list-exports', () => {
  for (const [path, id, name] of LISTS) {
    test(`${path}: Xuất → tải tệp + báo số dòng`, async ({ page }) => {
      test.skip(isMobile(page), 'nút Xuất nằm trên thanh công cụ desktop');
      await page.goto(`${path}?session=authed,declared,trialSeen`);
      const btn = page.getByTestId(id);
      await expect(btn).toBeVisible();
      const dl = page.waitForEvent('download');
      await btn.click();
      expect((await dl).suggestedFilename()).toMatch(name);
      await expect(page.locator('.ant-message')).toContainText(/Đã xuất \d+ dòng/);
      await expect(btn).toBeEnabled();
    });
  }
});
