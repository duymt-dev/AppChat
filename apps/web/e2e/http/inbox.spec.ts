// TIP-016 AC11 — E2E chế độ http (pnpm e2e:http): Hộp thư trên backend thật + worker ROLE=channels với Zalo giả (Q-003) có tin
// chào (`ZALO_FAKE_GREETING`): kết nối Zalo → khách nhắn tới → hội thoại hiện ở Hộp thư → mở → trả lời (gửi qua outbox → worker
// → sent) → gắn thẻ (tải lại vẫn giữ) → lưu trữ.
import { expect, test } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

test.describe('hộp thư (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('Zalo giả: tin vào → mở hội thoại → trả lời → gắn thẻ → lưu trữ', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await onboarded(page, 'inbox');

    await page.goto('/settings/channels');
    await page.getByTestId('st-ch-zalo_personal').click();
    const w = page.getByTestId('st-ch-wizard');
    await w.getByTestId('st-ch-wizard-label').fill('Zalo Hộp thư');
    await w.getByTestId('st-ch-wizard-next').click();
    await expect(w.getByTestId('st-ch-wizard-cfg-name')).toBeVisible({ timeout: 30_000 });
    await w.getByTestId('st-ch-wizard-next').click();
    await expect(w).toHaveCount(0);

    // Tin chào của khách giả tới sau khi phiên bắt đầu (worker ROLE=channels → inbound pipeline).
    await expect(async () => {
      await page.goto('/inbox');
      await expect(page.getByTestId('conv-row')).toHaveCount(1, { timeout: 2_000 });
    }).toPass({ timeout: 30_000 });
    const row = page.getByTestId('conv-row').first();
    await expect(row).toContainText('Khách E2E');
    await expect(row).toContainText('Chào shop, cho mình hỏi lịch hẹn');
    await row.locator('button').first().click();
    await expect(page.getByTestId('chat-header')).toContainText('Khách E2E');
    await expect(page.getByTestId('thread').getByTestId('msg-in')).toContainText('Chào shop, cho mình hỏi lịch hẹn');

    const input = page.getByTestId('composer-input');
    await input.fill('Dạ shop còn lịch chiều nay ạ');
    await input.press('Enter');
    await expect(page.getByTestId('thread').getByTestId('msg-out').last()).toContainText('Dạ shop còn lịch chiều nay ạ');
    await page.reload();
    await expect(page.getByTestId('thread').getByTestId('msg-out').last()).toContainText('Dạ shop còn lịch chiều nay ạ', { timeout: 15_000 });

    await page.getByTestId('conv-row').first().locator('.conv-dots').click();
    const menu = page.getByTestId('conv-menu');
    await menu.getByRole('menuitem', { name: 'Gắn thẻ' }).click();
    await menu.getByPlaceholder('Tạo thẻ mới…').fill('Khách mới E2E');
    await menu.getByRole('button', { name: '+ Thêm' }).click();
    await menu.getByRole('button', { name: /Xong · gắn 1 thẻ/ }).click();
    await expect(page.getByTestId('conv-row').first()).toContainText('Khách mới E2E');
    await page.reload();
    await expect(page.getByTestId('conv-row').first()).toContainText('Khách mới E2E');

    await page.getByTestId('conv-row').first().locator('.conv-dots').click();
    await page.getByTestId('conv-menu').getByRole('menuitem', { name: 'Lưu trữ hội thoại' }).click();
    await expect(page.getByTestId('conv-row')).toHaveCount(0);
  });
});
