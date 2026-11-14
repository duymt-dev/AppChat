// TIP-022c (http — pnpm e2e:http sales-agent-behavior): Sales agent trên backend thật (model giả — Q-001; model thật: fixture
// `fixtures/ai-eval/sales-agent-behavior.json`, chưa nghiệm thu — Q-051).
// 1) Builder: mẫu "Sales Agent · Bán lẻ" (rev 3) bật sẵn `stock.get` + `quote.request_revision` cùng bộ rev 2 → xuất bản.
// 2) Sản phẩm vật lý tồn 5 → khách widget hỏi "còn 2 hộp …" → câu gửi khách do server dựng từ tồn thật (số / giá / "chưa được giữ"); không
//    đổi tồn. Giảm tồn còn 1 → khách hỏi lại "còn 2 hộp" → không gửi lời hứa còn hàng: agent chuyển người (nháp trung thực theo tồn mới).
import { expect, test, type Page } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

const SHOP = 'https://shop-sales.e2e.test';

async function widget(page: Page, context: import('@playwright/test').BrowserContext) {
  await page.goto('/settings/web_widget');
  const embed = page.getByTestId('st-wg-embed');
  await page.getByTestId('st-wg-enabled').click();
  await expect(embed).toContainText('data-key="wk_', { timeout: 15_000 });
  await page.getByTestId('st-wg-agent').filter({ hasText: 'Sales Agent · Bán lẻ' }).click();
  await expect(async () => {
    await page.reload();
    await expect(page.locator('body')).toContainText('Sales Agent · Bán lẻ', { timeout: 2_000 });
  }).toPass({ timeout: 15_000 });
  const code = (await embed.textContent())!;
  const key = /data-key="([^"]+)"/.exec(code)![1]!;
  const api = /data-api="([^"]+)"/.exec(code)![1]!;
  await context.grantPermissions(['local-network-access']);
  const shop = await context.newPage();
  await shop.route(`${SHOP}/**`, (r) => r.fulfill({ contentType: 'text/html', body: `<!doctype html><html lang="vi"><body><h1>Spa</h1><script src="${api}/widget.js" async data-key="${key}" data-api="${api}"></script></body></html>` }));
  await shop.goto(`${SHOP}/`);
  const w = shop.locator('appchat-widget');
  await w.getByTestId('wg-launcher').click();
  await expect(w.getByTestId('wg-prechat')).toBeVisible({ timeout: 15_000 });
  await w.getByTestId('wg-pre-name').fill('Chị Hoa E2E');
  await w.getByTestId('wg-pre-phone').fill('0907333444');
  await w.getByTestId('wg-pre-start').click();
  return w;
}

test.describe('Sales agent — tồn kho có căn cứ + ý định báo giá (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('mẫu rev 3 → câu tồn server dựng → tồn giảm không hứa cũ', async ({ page, context }) => {
    test.skip(isMobile(page), 'luồng desktop');
    test.setTimeout(240_000);
    await onboarded(page, 'salesbeh');

    // 1) Mẫu Sales rev 3: tool tồn kho + xin sửa báo giá bật sẵn.
    await page.goto('/agents');
    await page.getByTestId('ag-tpl').filter({ hasText: 'Sales Agent · Bán lẻ' }).click();
    await expect(page.getByTestId('agb-name')).toHaveValue('Sales Agent · Bán lẻ');
    for (const id of ['stock.get', 'quote.request_revision', 'product.search', 'quote.mark_accepted']) {
      await expect(page.locator(`[data-tool="${id}"]`).getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    }
    await page.getByTestId('agb-publish').click();
    await expect(page.getByTestId('ag-card').filter({ hasText: 'Sales Agent · Bán lẻ' })).toHaveCount(1);

    // 2) Sản phẩm vật lý tồn 5.
    await page.goto('/products');
    await page.getByTestId('pd-add').click();
    const pf = page.getByTestId('pd-form');
    await pf.getByTestId('pd-f-type').selectOption('physical');
    await pf.getByTestId('pd-f-name').fill('Serum Sales B5');
    await pf.getByTestId('pd-f-price').fill('250000');
    await pf.getByTestId('pd-f-stock').fill('5');
    await pf.getByTestId('pd-save').click();
    await expect(pf).toHaveCount(0);

    const w = await widget(page, context);
    await w.getByTestId('wg-input').fill('Còn 2 hộp serum sales b5 không em?');
    await w.getByTestId('wg-input').press('Enter');
    const reply = w.getByTestId('wg-msg-out').last();
    await expect(reply).toContainText('còn hàng cho 2', { timeout: 45_000 });
    await expect(reply).toContainText('250.000');
    await expect(reply).toContainText('chưa được giữ');

    // Tồn không đổi (agent chỉ đọc).
    await page.goto('/products');
    await page.locator('[data-product]').filter({ hasText: 'Serum Sales B5' }).click();
    const drawer = page.getByTestId('pd-drawer');
    await expect(drawer.getByTestId('pd-stock-value')).toContainText('5');
    // Bán đồng thời: tồn còn 1.
    await drawer.getByTestId('pd-stock-open').click();
    const m = page.getByTestId('pd-stock');
    await m.getByTestId('pd-stock-delta').fill('-4');
    await m.getByTestId('pd-stock-reason').fill('Bán tại quầy');
    await m.getByTestId('pd-stock-save').click();
    await expect(drawer.getByTestId('pd-stock-value')).toContainText('1');

    const sent = await w.getByTestId('wg-msg-out').count();
    await w.getByTestId('wg-input').fill('Vậy lấy 2 hộp serum sales b5 nhé');
    await w.getByTestId('wg-input').press('Enter');
    // Model giả vẫn khai "còn hàng" → lệch tồn thật → chuyển người, KHÔNG có tin "còn hàng cho 2" mới.
    await page.goto('/inbox');
    await expect(async () => {
      await page.reload();
      await page.getByTestId('conv-row').first().locator('button').first().click();
      await expect(page.getByTestId('handoff-summary')).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 45_000 });
    expect(await w.getByTestId('wg-msg-out').count()).toBe(sent);
  });
});
