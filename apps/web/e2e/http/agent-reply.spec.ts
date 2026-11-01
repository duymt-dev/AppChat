// TIP-022 AC5 — E2E chế độ http (pnpm e2e:http): agent trực kênh trên backend thật (model giả — Q-001). Tạo + xuất bản agent →
// gán cho widget website → khách nhắn từ website → worker `agent-reply` (ROLE=ai) tự trả lời: khách thấy câu trả lời trong widget,
// Hộp thư hiện tin của agent (nhãn AI). Khách đòi gặp nhân viên → AI chuyển sang người (banner + lý do), không gửi gì cho khách.
import { expect, test } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

const SHOP = 'https://shop-ai.e2e.test';

test.describe('agent trực kênh (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('widget → agent tự trả lời; đòi gặp nhân viên → chuyển sang người', async ({ page, context }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await onboarded(page, 'agentreply');

    await page.goto('/agents');
    await page.getByTestId('ag-new').click();
    await page.getByTestId('agb-name').fill('Lễ tân Web');
    await page.getByTestId('agb-publish').click();
    await expect(page.getByTestId('ag-card').filter({ hasText: 'Lễ tân Web' })).toHaveCount(1);

    await page.goto('/settings/web_widget');
    const embed = page.getByTestId('st-wg-embed');
    await page.getByTestId('st-wg-enabled').click();
    await expect(embed).toContainText('data-key="wk_', { timeout: 15_000 });
    await page.getByTestId('st-wg-agent').filter({ hasText: 'Lễ tân Web' }).click();
    // Đã lưu: tải lại vẫn chọn agent này (xem trước hiện tên agent).
    await expect(async () => {
      await page.reload();
      await expect(page.getByTestId('st-wg-ai')).toBeVisible({ timeout: 2_000 });
      await expect(page.locator('body')).toContainText('Lễ tân Web', { timeout: 2_000 });
    }).toPass({ timeout: 15_000 });
    const code = (await embed.textContent())!;
    const key = /data-key="([^"]+)"/.exec(code)![1]!;
    const api = /data-api="([^"]+)"/.exec(code)![1]!;

    await context.grantPermissions(['local-network-access']);
    const shop = await context.newPage();
    await shop.route(`${SHOP}/**`, (r) =>
      r.fulfill({ contentType: 'text/html', body: `<!doctype html><html lang="vi"><body><h1>Spa</h1><script src="${api}/widget.js" async data-key="${key}" data-api="${api}"></script></body></html>` }),
    );
    await shop.goto(`${SHOP}/`);
    const w = shop.locator('appchat-widget');
    await w.getByTestId('wg-launcher').click();
    await expect(w.getByTestId('wg-prechat')).toBeVisible({ timeout: 15_000 });
    await w.getByTestId('wg-pre-name').fill('Chị Thu E2E');
    await w.getByTestId('wg-pre-phone').fill('0907654321');
    await w.getByTestId('wg-pre-start').click();
    await w.getByTestId('wg-input').fill('Spa mở cửa mấy giờ?');
    await w.getByTestId('wg-input').press('Enter');
    // Agent trả lời sau debounce 3 giây + một lượt model giả.
    await expect(w.getByTestId('wg-msg-out').last()).toContainText('Spa mở cửa mấy giờ?', { timeout: 30_000 });

    await page.goto('/inbox');
    await expect(page.getByTestId('conv-row')).toHaveCount(1, { timeout: 15_000 });
    await page.getByTestId('conv-row').first().locator('button').first().click();
    const agentMsg = page.getByTestId('thread').getByTestId('msg-agent');
    await expect(agentMsg).toContainText('Lễ tân Web');
    await expect(agentMsg).toContainText('Spa mở cửa mấy giờ?');

    // Khách đòi gặp nhân viên → model giả trả needs_human → chuyển sang người, không có tin mới cho khách.
    await w.getByTestId('wg-input').fill('Cho mình gặp nhân viên');
    await w.getByTestId('wg-input').press('Enter');
    await expect(async () => {
      await page.reload();
      await page.getByTestId('conv-row').first().locator('button').first().click();
      await expect(page.locator('body')).toContainText('AI cần người xử lý: Khách muốn gặp nhân viên', { timeout: 2_000 });
    }).toPass({ timeout: 30_000 });
    await expect(page.getByTestId('thread').getByTestId('msg-agent')).toHaveCount(1);
    // Lời chào của widget + đúng một câu trả lời của agent (không thêm tin khi chuyển sang người).
    await expect(w.getByTestId('wg-msg-out')).toHaveCount(2);
  });
});
