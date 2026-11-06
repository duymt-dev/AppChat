// TIP-022b (http — pnpm e2e:http agent-channel-behavior): hành vi agent trực kênh trên backend thật (model giả — Q-001).
// 1) Builder: agent với lịch tuần Tuỳ chỉnh (cả tuần 00:00–24:00 để kết quả không phụ thuộc giờ chạy) → xuất bản → mở lại đọc lịch từ DB.
// 2) Widget: khách hỏi giá → agent trả lời, Hộp thư hiện nhãn ý định "Muốn mua"; khách đòi gặp nhân viên → "Cần người" + tóm tắt bàn giao có
//    cấu trúc (worker ROLE=ai ghi), không có hành động "xong" bịa ra.
// 3) Zalo (worker kênh giả): drawer Quản lý kênh — bật lịch tài khoản + lời chào + phân luồng từ khoá với agent đã xuất bản → lưu → tải lại.
import { expect, test, type Page } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

const SHOP = 'https://shop-behavior.e2e.test';

async function allWeek(page: Page, prefix: string) {
  for (let d = 0; d < 7; d++) {
    await page.getByTestId(`${prefix}-${d}-add`).click();
    await page.getByTestId(`${prefix}-${d}-0-from`).fill('00:00');
    await page.getByTestId(`${prefix}-${d}-0-to`).fill('23:59');
  }
}

test.describe('hành vi agent trực kênh (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('lịch tuần agent → widget: ý định + tóm tắt bàn giao; drawer Zalo: lịch / lời chào / phân luồng lưu thật', async ({ page, context }) => {
    test.skip(isMobile(page), 'luồng desktop');
    test.setTimeout(180_000);
    await onboarded(page, 'chbehavior');

    // 1) Builder — lịch tuần có cấu trúc.
    await page.goto('/agents');
    await page.getByTestId('ag-new').click();
    await page.getByTestId('agb-name').fill('Lễ tân Lịch');
    await page.getByTestId('agb-hours').selectOption('custom');
    await allWeek(page, 'agb-week');
    await page.getByTestId('agb-publish').click();
    const card = page.getByTestId('ag-card').filter({ hasText: 'Lễ tân Lịch' });
    await expect(card).toHaveCount(1);
    await page.reload();
    await card.getByTestId('ag-edit').click();
    await expect(page.getByTestId('agb-hours')).toHaveValue('custom');
    await expect(page.getByTestId('agb-week-6-0-from')).toHaveValue('00:00');
    await expect(page.getByTestId('agb-schedule-warning')).toHaveCount(0);
    await page.getByTestId('agb-cancel').click();

    // 2) Widget gán agent → ý định + tóm tắt bàn giao.
    await page.goto('/settings/web_widget');
    const embed = page.getByTestId('st-wg-embed');
    await page.getByTestId('st-wg-enabled').click();
    await expect(embed).toContainText('data-key="wk_', { timeout: 15_000 });
    await page.getByTestId('st-wg-agent').filter({ hasText: 'Lễ tân Lịch' }).click();
    await expect(async () => {
      await page.reload();
      await expect(page.locator('body')).toContainText('Lễ tân Lịch', { timeout: 2_000 });
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
    await w.getByTestId('wg-pre-name').fill('Chị Mai E2E');
    await w.getByTestId('wg-pre-phone').fill('0907111222');
    await w.getByTestId('wg-pre-start').click();
    await w.getByTestId('wg-input').fill('Cho mình hỏi giá gói massage');
    await w.getByTestId('wg-input').press('Enter');
    await expect(w.getByTestId('wg-msg-out').last()).toContainText('giá gói massage', { timeout: 30_000 });

    await page.goto('/inbox');
    await expect(page.getByTestId('conv-row')).toHaveCount(1, { timeout: 15_000 });
    await page.getByTestId('conv-row').first().locator('button').first().click();
    await expect(page.getByTestId('intent-badge')).toHaveText('Muốn mua');

    await w.getByTestId('wg-input').fill('Cho mình gặp nhân viên');
    await w.getByTestId('wg-input').press('Enter');
    await expect(async () => {
      await page.reload();
      await page.getByTestId('conv-row').first().locator('button').first().click();
      await expect(page.getByTestId('handoff-summary')).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 30_000 });
    const s = page.getByTestId('handoff-summary');
    await expect(s).toContainText('Tóm tắt bàn giao');
    await expect(s.locator('[data-status="ok"]')).toHaveCount(0);

    // 3) Zalo — khối Hành vi AI Agent của drawer Quản lý kênh.
    await page.goto('/settings/channels');
    await page.getByTestId('st-ch-zalo_personal').click();
    const wz = page.getByTestId('st-ch-wizard');
    await wz.getByTestId('st-ch-wizard-label').fill('Zalo hành vi');
    await wz.getByTestId('st-ch-wizard-next').click();
    await expect(wz.getByTestId('st-ch-wizard-cfg-name')).toBeVisible({ timeout: 30_000 });
    await wz.getByTestId('st-ch-wizard-next').click();
    await expect(wz).toHaveCount(0);

    await page.getByTestId('st-ch-zalo_personal').click();
    const d = page.getByTestId('st-ch-drawer');
    await d.getByTestId(/^st-ch-drawer-acct-/).first().click();
    const b = d.getByTestId('st-ch-behavior');
    await b.getByTestId('st-ch-behavior-schedule-on').click();
    await allWeek(page, 'st-ch-behavior-week');
    await b.getByTestId('st-ch-behavior-greeting').click();
    await b.getByTestId('st-ch-behavior-routing').click();
    await b.getByTestId('st-ch-behavior-add').click();
    await b.getByTestId('st-ch-behavior-cand-0-agent').selectOption({ label: 'Lễ tân Lịch' });
    await b.getByTestId('st-ch-behavior-cand-0-keywords').fill('giá, đặt lịch');
    await b.getByTestId('st-ch-behavior-cand-0-keywords').blur();
    await b.getByTestId('st-ch-behavior-save').click();
    await expect(page.getByText('Đã lưu hành vi AI Agent')).toBeVisible();

    await page.reload();
    await page.getByTestId('st-ch-zalo_personal').click();
    await d.getByTestId(/^st-ch-drawer-acct-/).first().click();
    await expect(b.getByTestId('st-ch-behavior-greeting')).toHaveAttribute('aria-checked', 'true');
    await expect(b.getByTestId('st-ch-behavior-routing')).toHaveAttribute('aria-checked', 'true');
    await expect(b.getByTestId('st-ch-behavior-week-3-0-to')).toHaveValue('23:59');
    await expect(b.getByTestId('st-ch-behavior-cand-0-keywords')).toHaveValue('giá, đặt lịch');
  });
});
