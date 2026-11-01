// TIP-014 AC11 — E2E chế độ http (pnpm e2e:http): Cài đặt › Kênh kết nối trên backend thật + worker ROLE=channels với Zalo
// giả (Q-003): wizard Zalo → QR thật từ worker → tự quét → cấu hình nhanh → drawer (đổi chế độ AI, lưu, tải lại vẫn giữ) →
// tạm dừng / tiếp tục → ngắt tài khoản cuối → kênh "Chưa kết nối".
import { expect, test } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

test.describe('kênh kết nối (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('Zalo cá nhân: QR → kết nối → cấu hình → tạm dừng / tiếp tục → ngắt', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await onboarded(page, 'chan');
    await page.goto('/settings/channels');
    await expect(page.locator('[data-channel]')).toHaveCount(16);
    await expect(page.getByTestId('st-ch-facebook')).toBeDisabled();

    await page.getByTestId('st-ch-zalo_personal').click();
    const w = page.getByTestId('st-ch-wizard');
    await w.getByTestId('st-ch-wizard-label').fill('Zalo E2E');
    await w.getByTestId('st-ch-wizard-next').click();
    // QR từ worker (zca-js giả) rồi tự "quét" → sang bước 3.
    await expect(w.getByTestId('st-ch-wizard-cfg-name')).toBeVisible({ timeout: 30_000 });
    await w.getByTestId('st-ch-wizard-mode-suggest').click();
    await w.getByTestId('st-ch-wizard-next').click();
    await expect(w).toHaveCount(0);

    await page.getByTestId('st-ch-f-on').click();
    await expect(page.locator('[data-channel]')).toHaveCount(1);
    await expect(page.locator('[data-channel="zalo_personal"]')).toContainText('Đã kết nối');

    await page.getByTestId('st-ch-zalo_personal').click();
    const d = page.getByTestId('st-ch-drawer');
    await expect(d.getByTestId(/^st-ch-drawer-acct-/)).toHaveCount(1);
    await expect(d.getByTestId(/^st-ch-drawer-acct-/).first()).toContainText('Zalo E2E');
    await d.getByTestId(/^st-ch-drawer-acct-/).first().click();
    await d.getByTestId('st-ch-drawer-greeting').fill('Xin chào từ E2E');
    await d.getByTestId('st-ch-drawer-save').click();
    await expect(d).toHaveCount(0);

    await page.reload();
    await page.getByTestId('st-ch-zalo_personal').click();
    await d.getByTestId(/^st-ch-drawer-acct-/).first().click();
    await expect(d.getByTestId('st-ch-drawer-greeting')).toHaveValue('Xin chào từ E2E');
    await expect(d.getByTestId('st-ch-drawer-mode-suggest')).toHaveAttribute('aria-pressed', 'true');

    await d.getByTestId('st-ch-drawer-pause').click();
    await expect(d.getByTestId('st-ch-drawer-pause')).toHaveText('Tiếp tục');
    await d.getByTestId('st-ch-drawer-pause').click();
    await expect(d.getByTestId('st-ch-drawer-pause')).toHaveText('Tạm dừng');

    page.once('dialog', (x) => void x.accept());
    await d.getByTestId('st-ch-drawer-disconnect').click();
    await expect(d.getByTestId(/^st-ch-drawer-acct-/)).toHaveCount(0);
    await d.getByTestId('st-ch-drawer-close').click();
    await page.reload();
    await page.getByTestId('st-ch-f-off').click();
    await expect(page.locator('[data-channel="zalo_personal"]')).toHaveCount(1);
  });
});
