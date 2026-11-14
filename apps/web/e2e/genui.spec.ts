// GenUI trong màn Trợ lý (TIP-023c G1, mock): câu hỏi → chữ dẫn + cây (stat / progress / chart / bảng / nút); nút ui đổi màn; nút action
// do Trợ lý đề nghị LUÔN qua thẻ xem trước (kể cả action nguồn ui chạy thẳng); form có ô mật khẩu không điền sẵn, mật khẩu không nằm trong
// DOM sau khi gửi. Mobile 390: không tràn ngang.
import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow, isMobile } from './support/mobile';

const Q = '?session=authed,declared,trialSeen';
const SECRET = 'S3CRET-e2e-sentinel';

const ask = async (page: Page, text: string) => {
  const box = page.getByTestId('asst-composer').locator('textarea');
  await box.fill(text);
  await box.press('Enter');
};

const start = async (page: Page, text: string) => {
  await page.goto(`/assistant${Q}`);
  await ask(page, text);
};

/** Thẻ xem trước của ConfirmActionHost (modal "Xác nhận thao tác"). */
const preview = (page: Page) => page.getByRole('dialog', { name: 'Xác nhận thao tác' });

test.describe('genui', () => {
  test('doanh thu tuần: stat từ ref, tiến độ, biểu đồ; nút ui → Đơn hàng', async ({ page }) => {
    await start(page, 'Doanh thu tuần này so với mục tiêu?');
    const ui = page.getByTestId('genui');
    await expect(ui).toHaveAttribute('data-mode', 'full');
    await expect(ui.getByTestId('genui-stat').first()).toContainText('86.400.000₫');
    await expect(ui.getByTestId('genui-stat').first()).toContainText('+12.500.000₫');
    await expect(ui.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '72');
    await expect(ui.getByTestId('genui-chart')).toHaveAttribute('data-points', '6');
    await expect(ui.getByTestId('genui-chart').locator('canvas, svg').first()).toBeVisible();
    if (isMobile(page)) await expectNoHorizontalOverflow(page);
    await ui.getByTestId('genui-button').click();
    await expect(page).toHaveURL(/\/orders/);
  });

  test('khách mới: bảng mở khách; nút action do Trợ lý đề nghị → thẻ xem trước', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await start(page, 'Khách hàng mới trong 7 ngày qua');
    const ui = page.getByTestId('genui');
    await expect(ui.getByTestId('genui-table').locator('tbody tr')).toHaveCount(6);
    await ui.getByRole('button', { name: 'Gắn thẻ VIP cho chị Lan' }).click();
    await expect(preview(page)).toBeVisible();
    await preview(page).getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await expect(preview(page)).toBeHidden();
  });

  test('form email: ô mật khẩu trống, không lộ trong DOM sau gửi', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await start(page, 'Kết nối email hỗ trợ');
    const form = page.getByTestId('genui-form');
    await expect(form.locator('[data-field="address"]')).toHaveValue('hotro@spa.vn');
    const secret = form.getByTestId('genui-secret');
    await expect(secret).toHaveAttribute('type', 'password');
    await expect(secret).toHaveValue('');
    await secret.fill(SECRET);
    await form.getByTestId('genui-form-submit').click();
    await expect(preview(page)).toBeVisible();
    await preview(page).getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await expect(secret).toHaveValue('');
    expect(await page.content()).not.toContain(SECRET);
  });
});
