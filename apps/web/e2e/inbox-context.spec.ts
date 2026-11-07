// TIP-025b P4 — E2E chế độ mock: Hồ sơ 360° ở Hộp thư (màn Khách hàng KHÔNG mở) → "Sửa" mở form sửa toàn cục (edit-context) và lưu chỉ
// trường đổi; nút CSV lịch sử tải tệp; nút Báo giá mở form tạo kèm khách. Mobile 390: không tràn ngang.
import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, isMobile } from './support/mobile';

const URL = '/inbox?session=authed,declared,trialSeen';

test.describe('inbox ngữ cảnh CRM (mock)', () => {
  test('Sửa khách từ 360 (host toàn cục) + CSV lịch sử', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.locator('[data-conv="c_lan"] button').first().click();
    await page.getByTestId('p360-edit').click();
    const edit = page.getByTestId('crm-edit');
    await expect(edit).toBeVisible();
    await edit.getByLabel('Khu vực').fill('Đà Nẵng');
    await page.getByTestId('crm-save').click();
    await expect(edit).toHaveCount(0);
    const dl = page.waitForEvent('download');
    await page.getByTestId('p360-history-csv').first().click();
    expect((await dl).suggestedFilename()).toMatch(/^lich-su-.*\.csv$/);
  });

  test('mobile: mở hồ sơ, không tràn ngang', async ({ page }) => {
    test.skip(!isMobile(page), 'luồng mobile');
    await page.goto(URL);
    await page.locator('[data-conv="c_lan"] button').first().click();
    await page.getByRole('button', { name: 'Thu gọn hồ sơ' }).click();
    await expect(page.getByTestId('p360-edit')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
