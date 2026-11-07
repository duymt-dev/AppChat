// TIP-025b P5 — E2E chế độ mock: Đặt lịch hẹn từ ô soạn dùng khung giờ trống thật và mở form lịch hẹn chuẩn điền sẵn (không chèn câu xác
// nhận); tự dịch theo hội thoại: tin khách hiện bản dịch, Gửi → xem trước, chỉ "Gửi bản dịch" mới gửi; chụp màn hình không hỗ trợ → gợi ý
// chọn tệp. Mobile 390: popover không tràn ngang.
import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, isMobile } from './support/mobile';

const URL = '/inbox?session=authed,declared,trialSeen';
const open = async (page: import('@playwright/test').Page) => {
  await page.goto(URL);
  await page.locator('[data-conv="c_lan"] button').first().click();
  await expect(page.getByTestId('composer-input')).toBeVisible();
};

test.describe('inbox ô soạn — lịch hẹn / dịch / chụp màn hình (mock)', () => {
  test('Đặt lịch hẹn: khung giờ thật → form lịch hẹn điền sẵn', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Đặt lịch hẹn' }).click();
    const pop = page.getByTestId('sched-pop');
    await expect(pop.getByTestId('sched-slot').first()).toBeVisible();
    if (isMobile(page)) await expectNoHorizontalOverflow(page);
    await pop.getByTestId('sched-slot').first().click();
    await pop.getByTestId('sched-book').click();
    await expect(page.getByTestId('cal-customer')).toHaveValue(/Lan/);
    await expect(page.getByTestId('composer-input')).toHaveValue('');
  });

  test('Tự dịch: tin khách có bản dịch; Gửi → xem trước, Gửi bản dịch mới gửi', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await open(page);
    await page.getByRole('button', { name: 'Dịch', exact: true }).click();
    await page.getByTestId('xl-auto').click();
    await page.getByTestId('xl-to-ja').click();
    await expect(page.getByTestId('msg-auto-translated').first()).toContainText('[VI]');
    await page.getByRole('button', { name: /^Dịch/ }).first().click({ force: true });
    await expect(page.getByTestId('xl-pop')).toHaveCount(0);
    await page.getByTestId('composer-input').fill('Dạ giá 1.200.000đ ạ');
    await page.getByTestId('composer-send').click();
    await expect(page.getByTestId('xl-translated')).toHaveText('[JA] Dạ giá 1.200.000đ ạ');
    await expect(page.getByTestId('composer-input')).toHaveValue('Dạ giá 1.200.000đ ạ');
    await page.getByTestId('xl-send').click();
    await expect(page.getByTestId('composer-input')).toHaveValue('');
    await expect(page.getByTestId('thread')).toContainText('[JA] Dạ giá 1.200.000đ ạ');
  });

  test('Chụp màn hình không hỗ trợ → gợi ý chọn tệp', async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined }));
    await open(page);
    await page.getByLabel('Thêm tệp, kết nối, plugin').click();
    await page.getByTestId('attach-screenshot').click();
    await expect(page.getByTestId('capture-preview')).toContainText('không hỗ trợ');
    await expect(page.getByTestId('capture-fallback')).toBeVisible();
  });
});

test.describe('inbox thẻ duyệt (mock)', () => {
  test('hội thoại có yêu cầu duyệt: thẻ hiện, từ chối cập nhật', async ({ page }) => {
    await page.goto(URL);
    await page.locator('[data-conv="c_hieu"] button').first().click();
    const box = page.getByTestId('inbox-approvals');
    await expect(box.getByTestId('ap-card')).toHaveCount(1);
    if (isMobile(page)) await expectNoHorizontalOverflow(page);
    await box.getByTestId('ap-reject').click();
    await box.getByTestId('ap-reject-confirm').click();
    await expect(box.getByTestId('ap-card')).toHaveCount(0);
    await box.getByTestId('inbox-approvals-all').click();
    await expect(box.getByTestId('ap-card')).toContainText('Đã từ chối');
  });
});
