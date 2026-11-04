// TIP-043 AC8 — E2E chế độ http (pnpm e2e:http, worker ROLE=jobs + ai, model giả AI_ENGINE=mock): khách hỏi qua widget website thật →
// nhân viên trả lời ở Hộp thư → Đóng hội thoại → consumer `kb-suggest` (jobs) đẩy job → worker ai đề xuất qua AiRunner → hàng chờ "Chờ duyệt"
// ở Dữ liệu RAG hiện cặp hỏi–đáp đã che SĐT khách → sửa đáp án → Duyệt → tải lại: Đã duyệt, tài liệu "Từ hội thoại" Đã học (worker nạp).
// Không có tài liệu / nhãn "Đã học" trước khi duyệt.
import { expect, test } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

const SHOP = 'https://shop-kb.e2e.test';

test.describe('học từ hội thoại (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('khách hỏi → nhân viên đáp → đóng → AI đề xuất (đã che SĐT) → sửa → duyệt → Đã học', async ({ page, context }) => {
    test.skip(isMobile(page), 'luồng desktop');
    test.setTimeout(150_000);
    await onboarded(page, 'kbsug');

    await page.goto('/settings/web_widget');
    const embed = page.getByTestId('st-wg-embed');
    await page.getByTestId('st-wg-enabled').click();
    await expect(embed).toContainText('data-key="wk_', { timeout: 15_000 });
    const code = (await embed.textContent())!;
    const key = /data-key="([^"]+)"/.exec(code)![1]!;
    const api = /data-api="([^"]+)"/.exec(code)![1]!;
    await context.grantPermissions(['local-network-access']);
    const shop = await context.newPage();
    await shop.route(`${SHOP}/**`, (r) => r.fulfill({ contentType: 'text/html', body: `<!doctype html><html lang="vi"><body><script src="${api}/widget.js" async data-key="${key}" data-api="${api}"></script></body></html>` }));
    await shop.goto(`${SHOP}/`);
    const w = shop.locator('appchat-widget');
    await w.getByTestId('wg-launcher').click();
    await expect(w.getByTestId('wg-prechat')).toBeVisible({ timeout: 15_000 });
    await w.getByTestId('wg-pre-name').fill('Chị Hạnh E2E');
    await w.getByTestId('wg-pre-phone').fill('0901234567');
    await w.getByTestId('wg-pre-start').click();
    await w.getByTestId('wg-input').fill('Em ơi số em là 0901234567, cho chị hỏi đổi lịch hẹn được không?');
    await w.getByTestId('wg-input').press('Enter');

    await expect(async () => {
      await page.goto('/inbox');
      await expect(page.getByTestId('conv-row')).toHaveCount(1, { timeout: 2_000 });
    }).toPass({ timeout: 30_000 });
    await page.getByTestId('conv-row').first().locator('button').first().click();
    const input = page.getByTestId('composer-input');
    await input.fill('Dạ chị đổi lịch trước 24 giờ là được, miễn phí ạ.');
    await input.press('Enter');
    await expect(page.getByTestId('thread').getByTestId('msg-out').last()).toContainText('trước 24 giờ', { timeout: 15_000 });

    // Trước khi đóng: không có đề xuất, không tài liệu "Từ hội thoại".
    await page.goto('/settings/rag_data?nav=review');
    await expect(page.getByTestId('st-kbsug').locator('[data-sug]')).toHaveCount(0);

    await page.goto('/inbox');
    await page.getByTestId('conv-row').first().locator('.conv-dots').click();
    await page.getByRole('menuitem', { name: 'Đóng hội thoại' }).click();

    // Consumer (jobs) → job đề xuất (ai) → hàng chờ.
    const item = page.getByTestId('st-kbsug').locator('[data-sug]').first();
    await expect(async () => {
      await page.goto('/settings/rag_data?nav=review');
      await expect(item).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 60_000 });
    await expect(page.getByTestId('st-rag-nav-review')).toContainText('1');
    await expect(item).toContainText('đổi lịch hẹn');
    await expect(item).not.toContainText('0901234567');
    await expect(item.getByTestId('st-kbsug-chip')).toHaveText('Chờ duyệt');
    await page.getByTestId('st-rag-nav-conv').click();
    await expect(page.locator('[data-doc]')).toHaveCount(0);

    await page.getByTestId('st-rag-nav-review').click();
    await item.click();
    const d = page.getByTestId('st-kbsug-drawer');
    await d.getByTestId('st-kbsug-answer').fill('Khách đổi lịch trước 24 giờ, miễn phí.');
    await d.getByTestId('st-kbsug-approve').click();
    await expect(d).toHaveCount(0);

    await page.reload();
    await page.getByTestId('st-kbsug-tab-approved').click();
    const done = page.getByTestId('st-kbsug').locator('[data-sug]').first();
    await expect(done).toContainText('Khách đổi lịch trước 24 giờ, miễn phí.');
    await expect(async () => {
      await page.reload();
      await page.getByTestId('st-kbsug-tab-approved').click();
      await expect(done.getByTestId('st-kbsug-chip')).toHaveText('Đã học', { timeout: 2_000 });
    }).toPass({ timeout: 45_000 });
    await page.getByTestId('st-rag-nav-conv').click();
    await expect(page.locator('[data-doc]').first()).toContainText('Đã học');
  });
});
