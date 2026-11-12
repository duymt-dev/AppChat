// TIP-033c (mock): thẻ "Tạo đơn cho buổi này?" ở Lịch hẹn và Hộp thư đọc từ phép chiếu hiện hành — mở lại vẫn còn (không cờ tạm), xem
// trước bắt buộc (huỷ → không tạo đơn), xác nhận → biên nhận + mở đơn; thẻ biến mất sau khi tạo; mobile 390 không tràn ngang; vai trò không
// có order.manage thấy thẻ nhưng không có nút tạo.
import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow, isMobile } from './support/mobile';

const CAL = '/calendar?session=authed,declared,trialSeen';
const INBOX = '/inbox?session=authed,declared,trialSeen';
const ASSIST = '/assistant?session=authed,declared,trialSeen';
const ask = async (page: Page, text: string) => {
  const box = page.getByTestId('asst-composer').locator('textarea');
  await box.fill(text);
  await box.press('Enter');
};

test.describe('appointment-order', () => {
  test('Lịch hẹn: hoàn thành → đóng / mở lại drawer vẫn còn thẻ (phép chiếu, không cờ tạm); huỷ xem trước → không tạo', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(CAL);
    await page.locator('[data-appt="ap_1211"]').click();
    const d = page.getByTestId('cal-drawer');
    await d.getByTestId('cal-complete').click();
    await expect(d.getByTestId('appt-order-card')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(d).toBeHidden();
    await page.locator('[data-appt="ap_1211"]').click();
    const card = d.getByTestId('appt-order-card');
    await expect(card).toContainText('Tạo đơn cho buổi này?');
    await card.getByTestId('appt-order-create').click();
    await page.getByRole('button', { name: 'Huỷ' }).click();
    await expect(card.getByTestId('appt-order-create')).toBeEnabled();
    await expect(d.getByTestId('appt-order-created')).toHaveCount(0);
  });

  test('Hộp thư: hội thoại có lịch đã hoàn thành → thẻ tách khỏi bản nháp AI; xác nhận → biên nhận, mở lại không còn thẻ', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(INBOX);
    await page.locator('[data-conv="c_linh"] button').first().click();
    const card = page.getByTestId('appt-order-card');
    await expect(card).toContainText('LH-1202');
    await expect(card.getByTestId('appt-order-total')).toContainText('₫');
    await card.getByTestId('appt-order-create').click();
    await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await expect(page.getByTestId('appt-order-created')).toContainText('Đã tạo đơn');
    await page.locator('[data-conv="c_lan"] button').first().click();
    await page.locator('[data-conv="c_linh"] button').first().click();
    await expect(page.getByTestId('appt-order-card')).toHaveCount(0);
  });

  test('Hộp thư khác (không lịch gắn) → không thẻ', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(INBOX);
    await page.locator('[data-conv="c_lan"] button').first().click();
    await expect(page.getByTestId('chat-panel')).toBeVisible();
    await expect(page.getByTestId('appt-order-card')).toHaveCount(0);
  });

  test('mobile 390: thẻ ở Hộp thư không tràn ngang, nút đủ cỡ chạm', async ({ page }) => {
    test.skip(!isMobile(page), 'luồng mobile');
    await page.goto(INBOX);
    await page.locator('[data-conv="c_linh"] button').first().click();
    const card = page.getByTestId('appt-order-card');
    await expect(card).toBeVisible();
    await expectNoHorizontalOverflow(page);
    expect((await card.getByTestId('appt-order-create').boundingBox())!.height).toBeGreaterThanOrEqual(40);
  });

  test('Trợ lý: khối GenUI appointment_order → cùng thẻ (giá hiện hành), xác nhận qua xem trước → biên nhận', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(ASSIST);
    await ask(page, 'Tạo đơn cho buổi vừa xong');
    const ui = page.getByTestId('genui-appointment-order');
    const card = ui.getByTestId('appt-order-card');
    await expect(card).toContainText('Tạo đơn cho buổi này?');
    await expect(card.getByTestId('appt-order-total')).toContainText('₫');
    await card.getByTestId('appt-order-create').click();
    await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await expect(ui.getByTestId('appt-order-created')).toContainText('Đã tạo đơn');
  });
});
