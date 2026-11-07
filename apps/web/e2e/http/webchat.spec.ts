// TIP-017 AC8 — E2E chế độ http (pnpm e2e:http): bật widget ở Cài đặt › Trợ lý AI website → mã nhúng thật → trang website khách
// (origin giả, phục vụ bằng page.route) nhúng widget.js bản build của API → khách khai pre-chat + nhắn → hội thoại webchat hiện ở
// Hộp thư → trả lời → khách thấy realtime trong widget.
import { expect, test } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

const SHOP = 'https://shop.e2e.test';

test.describe('widget website (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('bật widget → khách nhắn từ website → Hộp thư → trả lời → khách nhận', async ({ page, context }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await onboarded(page, 'webchat');

    await page.goto('/settings/web_widget');
    const embed = page.getByTestId('st-wg-embed');
    await expect(embed).toContainText('Bật widget để lấy mã nhúng');
    await page.getByTestId('st-wg-enabled').click();
    await expect(embed).toContainText('data-key="wk_', { timeout: 15_000 });
    const code = (await embed.textContent())!;
    const key = /data-key="([^"]+)"/.exec(code)![1]!;
    const api = /data-api="([^"]+)"/.exec(code)![1]!;

    // Website của khách: một trang tĩnh nhúng đúng mã nhúng (widget.js + socket `/widget` của API thật). Chromium chặn trang origin
    // công khai gọi về localhost (Local Network Access) — production API có domain công khai; E2E cấp quyền cho trang giả.
    await context.grantPermissions(['local-network-access']);
    const shop = await context.newPage();
    await shop.route(`${SHOP}/**`, (r) =>
      r.fulfill({ contentType: 'text/html', body: `<!doctype html><html lang="vi"><body><h1>Spa demo</h1><script src="${api}/widget.js" async data-key="${key}" data-api="${api}"></script></body></html>` }),
    );
    await shop.goto(`${SHOP}/bang-gia`);
    const w = shop.locator('appchat-widget');
    await w.getByTestId('wg-launcher').click();
    await expect(w.getByTestId('wg-prechat')).toBeVisible({ timeout: 15_000 });
    await w.getByTestId('wg-pre-name').fill('Chị Mai E2E');
    await w.getByTestId('wg-pre-phone').fill('0901234567');
    await w.getByTestId('wg-pre-start').click();
    await w.getByTestId('wg-input').fill('Cho em hỏi giá gội đầu dưỡng sinh');
    await w.getByTestId('wg-input').press('Enter');
    await expect(w.getByTestId('wg-msg-in')).toContainText('Cho em hỏi giá gội đầu dưỡng sinh');

    await expect(async () => {
      await page.goto('/inbox');
      await expect(page.getByTestId('conv-row')).toHaveCount(1, { timeout: 2_000 });
    }).toPass({ timeout: 30_000 });
    const row = page.getByTestId('conv-row').first();
    await expect(row).toContainText('Chị Mai E2E');
    await row.locator('button').first().click();
    await expect(page.getByTestId('thread').getByTestId('msg-in')).toContainText('Cho em hỏi giá gội đầu dưỡng sinh');
    const input = page.getByTestId('composer-input');
    await input.fill('Dạ gói gội đầu dưỡng sinh 300k ạ');
    await input.press('Enter');

    await expect(w.getByTestId('wg-msg-out').last()).toContainText('Dạ gói gội đầu dưỡng sinh 300k ạ', { timeout: 20_000 });
    // Tải lại website: cùng khách (visitor_token) + lịch sử hai chiều.
    await shop.reload();
    await w.getByTestId('wg-launcher').click();
    await expect(w.getByTestId('wg-msg-in')).toContainText('Cho em hỏi giá gội đầu dưỡng sinh', { timeout: 15_000 });
    await expect(w.getByTestId('wg-msg-out').last()).toContainText('Dạ gói gội đầu dưỡng sinh 300k ạ');
  });
});
