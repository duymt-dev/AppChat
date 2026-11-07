// TIP-012 AC11 — E2E chế độ http (pnpm e2e:http): trang Cài đặt › Nền tảng kết nối trên backend thật — lọc nhóm, kết nối Casso
// (thiếu trường bị chặn), tải lại vẫn "Đã kết nối" (dữ liệu từ DB), Đăng ký quan tâm thẻ "Sắp có", ngắt kết nối.
import { expect, test } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

test.describe('nền tảng kết nối (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('kết nối Casso, Đăng ký quan tâm KiotViet, ngắt — trạng thái lấy từ backend', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await onboarded(page, 'int');
    await page.goto('/settings/integrations');
    await page.getByTestId('st-int-cat-payments').click();
    await expect(page.locator('[data-connector]')).toHaveCount(2);

    await page.locator('[data-connector="casso"]').click();
    const m = page.getByTestId('st-int-modal');
    await m.getByTestId('st-int-save').click();
    await expect(m).toBeVisible(); // thiếu api_key → 422 required, hộp vẫn mở
    await m.getByTestId('st-int-f-api_key').fill('ck_live_e2e');
    await m.getByTestId('st-int-save').click();
    await expect(m).toHaveCount(0);
    await expect(page.locator('[data-connector="casso"]')).toContainText('Thiết lập');

    await page.getByTestId('st-int-cat-all').click();
    await page.getByTestId('st-int-interest-kiotviet').click();
    await expect(page.getByTestId('st-int-interest-kiotviet')).toBeDisabled();

    // Tải lại: trạng thái đọc lại từ DB (không phải cache FE).
    await page.reload();
    await page.getByTestId('st-int-cat-payments').click();
    await expect(page.locator('[data-connector="casso"]')).toContainText('Thiết lập');
    await page.getByTestId('st-int-cat-all').click();
    await expect(page.getByTestId('st-int-interest-kiotviet')).toBeDisabled();

    // Ngắt kết nối từ hộp đã kết nối.
    await page.getByTestId('st-int-cat-payments').click();
    await page.locator('[data-connector="casso"]').click();
    await page.getByTestId('st-int-modal').getByTestId('st-int-save').click();
    await expect(page.getByTestId('st-int-modal')).toHaveCount(0);
    await expect(page.locator('[data-connector="casso"]')).not.toContainText('Thiết lập');
  });
});
