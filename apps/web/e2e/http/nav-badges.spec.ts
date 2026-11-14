// TIP-016b AC1 (http — pnpm e2e:http nav-badges): badge Hộp thư trên rail đọc `GET /v1/nav/badges` thật. Khách web nhắn 3 hội thoại
// (3 trình duyệt riêng) khi Chủ đang ở Tổng quan → badge Hộp thư lên 3 không F5 (Socket.IO `message.new` → invalidate badge → server
// bỏ cache 15 giây vì event đổi số). Mở + đọc một hội thoại → badge 2.
import { expect, test, type Browser, type BrowserContext } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

const SHOP = 'https://shop-badges.e2e.test';

async function visitorSays(browser: Browser, code: string, name: string, phone: string, text: string): Promise<BrowserContext> {
  const key = /data-key="([^"]+)"/.exec(code)![1]!;
  const api = /data-api="([^"]+)"/.exec(code)![1]!;
  const ctx = await browser.newContext();
  await ctx.grantPermissions(['local-network-access']);
  const shop = await ctx.newPage();
  await shop.route(`${SHOP}/**`, (r) =>
    r.fulfill({ contentType: 'text/html', body: `<!doctype html><html lang="vi"><body><h1>Spa</h1><script src="${api}/widget.js" async data-key="${key}" data-api="${api}"></script></body></html>` }),
  );
  await shop.goto(`${SHOP}/`);
  const w = shop.locator('appchat-widget');
  await w.getByTestId('wg-launcher').click();
  await expect(w.getByTestId('wg-prechat')).toBeVisible({ timeout: 15_000 });
  await w.getByTestId('wg-pre-name').fill(name);
  await w.getByTestId('wg-pre-phone').fill(phone);
  await w.getByTestId('wg-pre-start').click();
  await w.getByTestId('wg-input').fill(text);
  await w.getByTestId('wg-input').press('Enter');
  return ctx;
}

test.describe('badge rail (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('3 hội thoại chưa đọc → badge Hộp thư 3 (realtime, không F5); đọc một → 2', async ({ page, browser }) => {
    test.skip(isMobile(page), 'rail chỉ ở desktop');
    await onboarded(page, 'navbadge');
    await page.goto('/settings/web_widget');
    await page.getByTestId('st-wg-enabled').click();
    await expect(page.getByTestId('st-wg-embed')).toContainText('data-key="wk_', { timeout: 15_000 });
    const code = (await page.getByTestId('st-wg-embed').textContent())!;

    await page.goto('/dashboard');
    const inboxBadge = page.locator('[data-nav="inbox"]').getByTestId('nav-badge');
    await expect(inboxBadge).toHaveCount(0);
    const visitors: BrowserContext[] = [];
    for (const [i, name] of ['Khách Badge Một', 'Khách Badge Hai', 'Khách Badge Ba'].entries()) visitors.push(await visitorSays(browser, code, name, `090711100${i}`, `Xin chào lần ${i + 1}`));
    await expect(inboxBadge).toHaveText('3', { timeout: 20_000 });

    await page.locator('[data-nav="inbox"]').click();
    const row = page.getByTestId('conv-row').filter({ hasText: 'Khách Badge Hai' });
    await row.locator('button').first().click();
    await expect(page.getByTestId('chat-header')).toContainText('Khách Badge Hai');
    await expect(inboxBadge).toHaveText('2', { timeout: 20_000 });
    for (const v of visitors) await v.close();
  });
});
