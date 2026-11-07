// TIP-018 AC6 — E2E chế độ http (pnpm e2e:http): kênh Email trên backend thật + hộp thư giả (`MAIL_TRANSPORT=fake`, worker có thư
// khách chào sẵn — `MAIL_FAKE_GREETING`): wizard Email (sai mật khẩu → lý do; đúng → kiểm tra ok) → kết nối → worker poll → thư
// vào Hộp thư → mở → trả lời (SMTP giả qua outbox → sent).
import { expect, test } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

test.describe('kênh email (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('Email giả: kiểm tra form → kết nối → thư vào Hộp thư → trả lời', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await onboarded(page, 'mail');
    await page.goto('/settings/channels');
    await page.getByTestId('st-ch-email').click();
    const w = page.getByTestId('st-ch-wizard');
    await w.getByTestId('st-ch-wizard-imap_host').fill('imap.fake.test');
    await w.getByTestId('st-ch-wizard-address').fill(`cskh-${Date.now()}@spa-e2e.vn`);
    await w.getByTestId('st-ch-wizard-password').fill('sai-mat-khau');
    await w.getByTestId('st-ch-wizard-test').click();
    await expect(w.getByTestId('st-ch-wizard-test-error')).toBeVisible();
    await expect(w.getByTestId('st-ch-wizard-next')).toBeDisabled();
    await w.getByTestId('st-ch-wizard-password').fill('app-password-e2e');
    await w.getByTestId('st-ch-wizard-test').click();
    await expect(w.getByTestId('st-ch-wizard-tested')).toBeVisible();
    await w.getByTestId('st-ch-wizard-next').click();
    await expect(w.getByTestId('st-ch-wizard-cfg-name')).toBeVisible();
    await w.getByTestId('st-ch-wizard-next').click();
    await expect(w).toHaveCount(0);
    await page.getByTestId('st-ch-f-on').click();
    await expect(page.locator('[data-channel="email"]')).toContainText('Đã kết nối');

    // Thư chào của khách giả: worker poll ngay khi tài khoản chạy → inbound pipeline → Hộp thư.
    await expect(async () => {
      await page.goto('/inbox');
      await expect(page.getByTestId('conv-row')).toHaveCount(1, { timeout: 2_000 });
    }).toPass({ timeout: 45_000 });
    const row = page.getByTestId('conv-row').first();
    await expect(row).toContainText('Khách Email E2E');
    await row.locator('button').first().click();
    await expect(page.getByTestId('thread').getByTestId('msg-in')).toContainText('Spa còn lịch chiều nay không ạ?');

    const input = page.getByTestId('composer-input');
    await input.fill('Dạ còn lịch 15h ạ');
    await input.press('Enter');
    await expect(page.getByTestId('thread').getByTestId('msg-out').last()).toContainText('Dạ còn lịch 15h ạ');
    await page.reload();
    await expect(page.getByTestId('thread').getByTestId('msg-out').last()).toContainText('Dạ còn lịch 15h ạ', { timeout: 15_000 });
  });
});
