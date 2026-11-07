// TIP-024 AC4 — E2E chế độ http (pnpm e2e:http): AI Agents + Chờ duyệt + Nhật ký trên backend thật (model giả — Q-001).
// 1) Mẫu "CSKH Agent · Dịch vụ" → builder mang vai trò + tool mặc định của mẫu (D15) → đặt từ khoá + giờ → xuất bản → thẻ hiện vai
//    trò; tải lại builder vẫn giữ từ khoá / giờ. Trợ lý AI: mô tả → "Tạo & xuất bản". Xoá agent.
// 2) Agent trực website có quyền gửi QR thanh toán → khách xin QR → agent xin duyệt (risk send) → Nhật ký "Đang chờ" có dòng →
//    Chờ duyệt: Sửa & duyệt → tab Đã duyệt "Đã sửa & duyệt"; yêu cầu thứ hai → Từ chối có lý do. Nhật ký: hoàn tác sửa agent.
import { expect, test, type Page } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

const SHOP = 'https://shop-agents.e2e.test';

test.describe('AI Agents · Chờ duyệt · Nhật ký (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('mẫu → builder có vai trò + tool mặc định; từ khoá / giờ lưu; Trợ lý tạo & xuất bản; xoá', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await onboarded(page, 'agentsui');
    await page.goto('/agents');
    await page.getByTestId('ag-tpl').filter({ hasText: 'CSKH Agent · Dịch vụ' }).click();
    await expect(page.getByTestId('agb-name')).toHaveValue('CSKH Agent · Dịch vụ');
    await expect(page.getByTestId('agb-prompt')).toHaveValue(/CSKH/);
    await expect(page.locator('[data-tool="ticket.create"]').getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('agb-role-label')).toHaveValue('CSKH');
    await page.getByTestId('agb-role-label').fill('Chăm sóc khách hàng');
    await page.getByTestId('agb-keywords').fill('bảo hành, khiếu nại');
    await page.getByTestId('agb-keywords').blur();
    await page.getByTestId('agb-hours').selectOption('office');
    // Mô phỏng kênh: chọn kênh → trả lời vẫn chạy (dry-run).
    await page.getByTestId('agb-testSim').click();
    await page.getByTestId('agb-test-input').fill('Bảo hành bao lâu?');
    await page.getByTestId('agb-test-send').click();
    await expect(page.getByTestId('agb-ai-msg').nth(1)).toContainText('Bảo hành bao lâu?');
    await page.getByTestId('agb-publish').click();

    const card = page.getByTestId('ag-card').filter({ hasText: 'CSKH Agent · Dịch vụ' });
    await expect(card).toContainText('Chăm sóc khách hàng');
    await card.getByTestId('ag-edit').click();
    await expect(page.getByTestId('agb-keywords')).toHaveValue('bảo hành, khiếu nại');
    await expect(page.getByTestId('agb-hours')).toHaveValue('office');
    await page.getByTestId('agb-cancel').click();

    await page.getByTestId('ag-ai').click();
    await expect(page.getByTestId('ag-ai-sug')).toHaveCount(4);
    await expect(page.getByTestId('ag-ai-drawer')).toContainText('1 agent đang chạy');
    await page.getByTestId('ag-ai-sug').first().click();
    await page.getByTestId('ag-ai-input').fill('Agent đặt lịch cho spa qua website');
    await page.getByTestId('ag-ai-send').click();
    await expect(page.getByTestId('ag-ai-draft')).toBeVisible({ timeout: 20_000 });
    await page.getByTestId('ag-ai-publish').click();
    await expect(page.getByTestId('ag-ai-done')).toBeVisible();
    await page.getByTestId('ag-ai-drawer').getByRole('button', { name: 'Đóng' }).click();
    await expect(page.getByTestId('ag-card')).toHaveCount(2);

    await card.getByTestId('ag-delete').click();
    await expect(page.getByTestId('ag-card')).toHaveCount(1);
    await page.reload();
    await expect(page.getByTestId('ag-card')).toHaveCount(1);
  });

  test('agent xin duyệt gửi QR → Nhật ký "Đang chờ" → Sửa & duyệt / Từ chối có lý do; Nhật ký hoàn tác', async ({ page, context, browser }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await onboarded(page, 'approvals');
    await publishQrAgent(page);
    const shop = await openWidget(page, context);
    const w = shop.locator('appchat-widget');
    await w.getByTestId('wg-input').fill('Cho xin mã QR thanh toán DN-0001');
    await w.getByTestId('wg-input').press('Enter');

    // Agent trả lời sau debounce 3 giây + lượt model giả → yêu cầu duyệt; màn chưa có socket (TIP-025) → đổi bộ lọc để đọc lại (không
    // tải lại trang liên tục — mỗi lần tải xoay refresh token).
    await page.goto('/assistant/actions');
    await expect(async () => {
      await page.getByTestId('log-status').selectOption('all');
      await page.getByTestId('log-status').selectOption('pending');
      await expect(page.getByTestId('log-status-badge').first()).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 45_000 });

    await page.goto('/assistant/approvals');
    const first = page.getByTestId('ap-card').first();
    await expect(first).toContainText('Thu Ngân Web', { timeout: 15_000 });
    await first.getByTestId('ap-edit').click();
    await first.locator('[data-field="invoice_id"]').fill('DN-0002');
    await first.getByTestId('ap-edit-save').click();
    await expect(page.getByTestId('ap-card')).toHaveCount(0);
    await page.getByRole('tab', { name: 'Đã duyệt' }).click();
    await expect(page.getByTestId('ap-card').first()).toContainText('Đã sửa & duyệt');

    // Hội thoại đầu đã chờ duyệt / chuyển người → khách khác (trình duyệt riêng) xin QR lần nữa.
    await page.goto('/settings/web_widget');
    const other = await openWidget(page, await browser.newContext(), 'Anh Minh E2E', '0907333444');
    const w2 = other.locator('appchat-widget');
    await w2.getByTestId('wg-input').fill('Gửi QR thanh toán DN-0003');
    await w2.getByTestId('wg-input').press('Enter');
    await page.goto('/assistant/approvals');
    const second = page.getByTestId('ap-card').first();
    await expect(async () => {
      await page.getByRole('tab', { name: 'Đã từ chối' }).click();
      await page.getByRole('tab', { name: 'Đang chờ' }).click();
      await expect(second).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 45_000 });
    await second.getByTestId('ap-reject').click();
    await second.getByTestId('ap-reject-note').fill('Khách đã chuyển khoản');
    await second.getByTestId('ap-reject-confirm').click();
    await page.getByRole('tab', { name: 'Đã từ chối' }).click();
    await expect(page.getByTestId('ap-card').first()).toContainText('Khách đã chuyển khoản');

    // Nhật ký: sửa agent (agent.update, hoàn tác 24 giờ) → hoàn tác.
    await page.goto('/assistant/actions');
    await page.getByTestId('log-search').fill('sua & duyet');
    await expect(page.getByTestId('action-log')).toContainText('Sửa & duyệt', { timeout: 15_000 });
    await page.getByTestId('log-search').fill('');
    const undo = page.getByTestId('log-undo').first();
    await expect(undo).toBeVisible();
    await undo.click();
    await expect(page.locator('.ant-message')).toContainText('Đã hoàn tác');
  });
});

/** Agent "Thu Ngân Web" (tool gửi QR thanh toán) gán cho widget website — sửa bản nháp một lần để Nhật ký có dòng hoàn tác được. */
async function publishQrAgent(page: Page) {
  await page.goto('/agents/new');
  await page.getByTestId('agb-name').fill('Thu Ngân Web');
  await page.locator('[data-tool="invoice.send_payment_qr"]').getByRole('switch').click();
  await page.getByTestId('agb-publish').click();
  const card = page.getByTestId('ag-card').filter({ hasText: 'Thu Ngân Web' });
  await expect(card).toHaveCount(1);
  await card.getByTestId('ag-edit').click();
  await page.getByTestId('agb-threshold').fill('60');
  await page.getByTestId('agb-publish').click();
  await expect(card.getByTestId('ag-version')).toHaveText('v2');

  await page.goto('/settings/web_widget');
  await page.getByTestId('st-wg-enabled').click();
  await expect(page.getByTestId('st-wg-embed')).toContainText('data-key="wk_', { timeout: 15_000 });
  await page.getByTestId('st-wg-agent').filter({ hasText: 'Thu Ngân Web' }).click();
  await expect(async () => {
    await page.reload();
    await expect(page.locator('body')).toContainText('Thu Ngân Web', { timeout: 2_000 });
  }).toPass({ timeout: 15_000 });
}

async function openWidget(page: Page, context: import('@playwright/test').BrowserContext, name = 'Chị Hạnh E2E', phone = '0907111222') {
  const code = (await page.getByTestId('st-wg-embed').textContent())!;
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
  await w.getByTestId('wg-pre-name').fill(name);
  await w.getByTestId('wg-pre-phone').fill(phone);
  await w.getByTestId('wg-pre-start').click();
  return shop;
}
