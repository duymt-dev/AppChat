// TIP-025b P2 — E2E chế độ mock: tìm trong hội thoại có trang (N/M theo tổng, ↑/↓ đi kết quả, đoạn trích tô <mark>) → nhảy tới tin
// (cửa sổ quanh tin, dải "Về tin mới nhất") → về luồng thường; Esc đóng. Mobile 390 không tràn ngang.
import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, isMobile } from './support/mobile';

const URL = '/inbox?session=authed,declared,trialSeen';

test.describe('tìm trong hội thoại (mock)', () => {
  test('tìm → N/M → nhảy tới tin → về mới nhất; Esc đóng', async ({ page }) => {
    await page.goto(URL);
    if (isMobile(page)) await page.getByTestId('conv-row').first().click();
    await page.getByTestId('chat-search-toggle').click();
    const input = page.getByTestId('thread-search-input');
    await input.fill('hifu');
    await expect(page.getByTestId('thread-search-count')).toHaveText(/^1\/\d+$/);
    await expect(page.getByTestId('thread-search-snippet').locator('mark').first()).toHaveText(/hifu/i);
    await expect(page.getByTestId('thread-jumped')).toBeVisible();
    await expect(page.locator('[data-hit="on"]')).toHaveCount(1);
    await page.getByTestId('thread-latest').click();
    await expect(page.getByTestId('thread-jumped')).toHaveCount(0);
    await input.fill('khong co chu nay');
    await expect(page.getByTestId('thread-search-count')).toHaveText('0/0');
    if (isMobile(page)) await expectNoHorizontalOverflow(page);
    await input.press('Escape');
    await expect(page.getByTestId('thread-search')).toHaveCount(0);
  });
});
