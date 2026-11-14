// TIP-025 AC3 — E2E chế độ http (pnpm e2e:http): Hộp thư nối realtime + bộ lọc + tệp + ghi chú @ + dịch + chế độ AI + deep link trên
// backend thật (widget web — khách ở trình duyệt riêng; model giả — Q-001). Người dùng mở Hộp thư TRƯỚC khi khách nhắn → hội thoại
// và tin mới hiện không tải lại (Socket.IO `/ws`). "Nhắc đến tôi" của thành viên khác: integration `inbox-ui.test.ts` (workspace
// trial ở E2E chỉ có Owner — không tự nhắc chính mình).
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

const SHOP = 'https://shop-inbox.e2e.test';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

test.describe('hộp thư realtime (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('khách nhắn → hiện không tải lại; tìm không dấu / lọc kênh; gửi ảnh; ghi chú @; dịch; Tắt AI; deep link', async ({ page, browser }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await onboarded(page, 'inboxlive');
    await page.goto('/settings/web_widget');
    await page.getByTestId('st-wg-enabled').click();
    await expect(page.getByTestId('st-wg-embed')).toContainText('data-key="wk_', { timeout: 15_000 });
    const code = (await page.getByTestId('st-wg-embed').textContent())!;

    // Mở Hộp thư trước — mọi thay đổi sau đây tới qua socket.
    await page.goto('/inbox');
    await expect(page.getByTestId('inbox')).toBeVisible();
    const visitor = await browser.newContext();
    const w = (await openWidget(visitor, code)).locator('appchat-widget');
    await w.getByTestId('wg-input').fill('Spa còn lịch HIFU chiều nay không ạ?');
    await w.getByTestId('wg-input').press('Enter');
    const row = page.getByTestId('conv-row').filter({ hasText: 'Chị Hạnh E2E' });
    await expect(row).toHaveCount(1, { timeout: 5_000 });

    await row.locator('button').first().click();
    await expect(page.getByTestId('chat-header')).toContainText('Chị Hạnh E2E');
    await w.getByTestId('wg-input').fill('Mình muốn đặt 15h');
    await w.getByTestId('wg-input').press('Enter');
    await expect(page.getByTestId('thread').getByTestId('msg-in').last()).toContainText('Mình muốn đặt 15h', { timeout: 5_000 });

    // Tìm không dấu + lọc kênh (API).
    const search = page.getByRole('textbox', { name: /Tìm khách, SĐT/ });
    await search.fill('chi hanh');
    await expect(page.getByTestId('conv-row')).toHaveCount(1);
    await search.fill('khong co ai ten nay');
    await expect(page.getByTestId('conv-empty')).toBeVisible();
    await search.fill('');
    await expect(page.getByTestId('conv-row')).toHaveCount(1);

    // Gửi ảnh: menu ＋ → Thêm tệp → tải lên → gửi → bong bóng ảnh (link ký).
    await page.getByRole('button', { name: 'Thêm tệp, kết nối, plugin' }).click();
    const chooser = page.waitForEvent('filechooser');
    await page.getByTestId('attach-file').click();
    await (await chooser).setFiles({ name: 'bang-gia.png', mimeType: 'image/png', buffer: PNG });
    await expect(page.getByTestId('composer-file')).toContainText('bang-gia.png');
    await expect(page.getByTestId('composer-send')).toBeEnabled({ timeout: 10_000 });
    await page.getByTestId('composer-send').click();
    await expect(page.getByTestId('thread').getByTestId('msg-image').last()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('thread').getByTestId('msg-image').last()).toHaveJSProperty('complete', true);

    // Ghi chú nội bộ có @: gõ @ → gợi ý thành viên → chọn → lưu.
    await page.getByTestId('mode-note').click();
    const input = page.getByTestId('composer-input');
    await input.fill('Nhờ @');
    await expect(page.getByTestId('mention-pop')).toBeVisible();
    await page.getByTestId('mention-pop').getByRole('option').first().click();
    await expect(input).toHaveValue(/^Nhờ @\S+ $/);
    await input.pressSequentially('gọi lại khách');
    await page.getByTestId('composer-send').click();
    await expect(page.getByTestId('thread').getByTestId('note').last()).toContainText('gọi lại khách');
    await page.getByTestId('mode-note').click();

    // Dịch tin khách (model giả: tiền tố ngôn ngữ).
    await page.getByTestId('thread').getByTestId('msg-in').last().getByTestId('msg-dots').click();
    await page.getByTestId('chat-menu').getByRole('menuitem', { name: 'Dịch' }).click();
    await expect(page.getByTestId('msg-translated')).toContainText('[VI] Mình muốn đặt 15h', { timeout: 15_000 });

    // Chế độ AI hiện tại sáng; bấm lại = Tắt.
    const auto = page.getByTestId('mode-auto');
    await expect(auto).toHaveAttribute('aria-pressed', 'true');
    await auto.click();
    await expect(auto).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('mode-copilot')).toHaveAttribute('aria-pressed', 'false');

    // Deep link (thông báo): /inbox?c=<id> mở đúng hội thoại.
    const id = (await row.getAttribute('data-conv'))!;
    await page.goto(`/inbox?c=${id}`);
    await expect(page.getByTestId('chat-header')).toContainText('Chị Hạnh E2E');
    await expect(page.getByTestId('mode-auto')).toHaveAttribute('aria-pressed', 'false');
    await visitor.close();
  });
});

async function openWidget(context: BrowserContext, code: string): Promise<Page> {
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
  await w.getByTestId('wg-pre-name').fill('Chị Hạnh E2E');
  await w.getByTestId('wg-pre-phone').fill('0907111999');
  await w.getByTestId('wg-pre-start').click();
  return shop;
}
