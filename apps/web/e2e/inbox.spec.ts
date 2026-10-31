import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, expectTouchTargets, isMobile } from './support/mobile';

const URL = '/inbox?session=authed,declared,trialSeen';

test.describe('inbox', () => {
  test('gửi tin, ghi chú nội bộ, gợi ý AI', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await expect(page.getByTestId('chat-header')).toContainText('Chị Lan — Spa Hương Sen');
    const input = page.getByTestId('composer-input');
    await input.fill('Dạ em giữ lịch cho chị nhé');
    await input.press('Enter');
    await expect(page.getByTestId('thread').getByTestId('msg-out').last()).toContainText('Dạ em giữ lịch cho chị nhé');
    await page.getByRole('button', { name: 'Ghi chú nội bộ', exact: true }).click();
    await input.fill('Khách VIP, ưu tiên KTV Hồng');
    await page.getByTestId('composer-send').click();
    await expect(page.getByTestId('note')).toContainText('Khách VIP, ưu tiên KTV Hồng');
    await page.getByTestId('ai-suggest').getByRole('button', { name: 'Chỉnh sửa' }).click();
    await expect(input).toHaveValue(/khung 14:00/);
  });

  test('menu hội thoại + menu tin nhắn + bỏ ghim', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.locator('[data-conv="c_lan"] .conv-dots').click();
    await expect(page.getByTestId('conv-menu')).toBeVisible();
    await page.getByRole('menuitem', { name: 'Đóng hội thoại' }).click();
    await expect(page.locator('[data-conv="c_lan"]')).toHaveCount(0);
    await page.locator('[data-conv="g_vip"] button').first().click();
    await expect(page.getByTestId('group-info')).toContainText('24 thành viên');
    await page.getByTestId('group-members').click();
    await expect(page.getByTestId('group-info')).toContainText('Hồng Nhung');
  });

  test('handoff: nhận xử lý + dùng bản nháp', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.locator('[data-conv="c_hieu"] button').first().click();
    const banner = page.getByTestId('handoff-banner');
    await expect(banner).toContainText('Khách hỏi số tài khoản');
    await banner.getByRole('button', { name: 'Dùng bản nháp' }).click();
    await expect(page.getByTestId('composer-input')).toHaveValue(/Vietcombank/);
    await banner.getByTestId('handoff-take').click();
    await expect(banner).toHaveCount(0);
  });

  test('kết nối kênh: chỉ kênh có manifest bấm được', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.getByTestId('inbox-connect').click();
    const modal = page.getByTestId('connect-modal');
    await expect(modal.getByTestId('connect-zalo_oa')).toHaveAttribute('aria-disabled', 'true');
    await expect(modal.getByTestId('connect-zalo_personal')).toHaveAttribute('aria-disabled', 'false');
    await modal.getByTestId('connect-zalo_personal').click();
    await expect(page).toHaveURL(/settings\/channels\?connect=zalo_personal/);
  });

  test('vai trò Kế toán: không có hộp thư soạn tin', async ({ page }) => {
    test.skip(isMobile(page), 'dev toolbar chỉ thao tác trên desktop');
    await page.goto(URL);
    await expect(page.getByTestId('composer')).toBeVisible();
    await page.getByTestId('dev-toolbar').locator('.ant-select').click();
    await page.locator('.ant-select-item-option', { hasText: 'Kế toán' }).click();
    await expect(page.getByTestId('composer')).toHaveCount(0);
    await expect(page.getByTestId('inbox-connect')).toHaveCount(0);
  });

  test('Hồ sơ 360°: 6 nút mở form tại chỗ theo luật COMMERCE (REQ-F11)', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.locator('[data-conv="c_lan"] button').first().click();
    // Báo giá mới nhất (BG-2041) đã duyệt, chưa gửi → không sửa / xin sửa được (QUOTE_FLOW) → mở form tạo báo giá mới điền sẵn khách.
    await page.getByTestId('p360-quote').click();
    const qForm = page.getByTestId('q-form');
    await expect(qForm).toBeVisible();
    await expect(qForm).toContainText('Tạo báo giá');
    await qForm.locator('button[aria-label]').first().click();
    await expect(qForm).toHaveCount(0);
    // Hợp đồng đã ký (HD-1180) → mở chi tiết chỉ xem, không phải form sửa.
    await page.getByTestId('p360-contract').click();
    const ctDrawer = page.getByTestId('ct-drawer');
    await expect(ctDrawer).toBeVisible();
    await expect(page.getByTestId('ct-form')).toHaveCount(0);
    await ctDrawer.locator('button[aria-label]').first().click();
    await expect(ctDrawer).toHaveCount(0);
    // Đơn / Ticket / Lịch hẹn: luôn tạo mới, điền sẵn khách.
    await page.getByTestId('p360-order').click();
    const odForm = page.getByTestId('od-form');
    await expect(odForm).toBeVisible();
    await odForm.locator('button[aria-label]').first().click();
    await expect(odForm).toHaveCount(0);
    await page.getByTestId('p360-ticket').click();
    const tkForm = page.getByTestId('tk-form');
    await expect(tkForm).toBeVisible();
    await tkForm.locator('button[aria-label]').first().click();
    await expect(tkForm).toHaveCount(0);
    await page.getByTestId('p360-booking').click();
    const calForm = page.getByTestId('cal-form');
    await expect(calForm).toBeVisible();
    await calForm.locator('button[aria-label]').first().click();
    await expect(calForm).toHaveCount(0);
    // Gửi email: modal soạn email, điền sẵn "Đến" từ hồ sơ khách.
    await page.getByTestId('p360-email').click();
    const mail = page.getByTestId('email-compose');
    await expect(mail).toBeVisible();
    await expect(page.getByTestId('email-to')).toHaveValue(/Chị Lan/);
    await page.getByTestId('email-send').click();
    await expect(mail).toHaveCount(0);
  });

  test('Hồ sơ 360°: nút ⚙ mở hộp Tuỳ chỉnh bố cục đúng mẫu của vai trò (REQ-F12)', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.locator('[data-conv="c_lan"] button').first().click();
    await page.getByTestId('p360-customize').click();
    const editor = page.getByTestId('pl-editor');
    await expect(editor).toBeVisible();
    await expect(editor).toContainText('Tuỳ chỉnh Hồ sơ 360°');
    await page.getByTestId('pl-editor-done').click();
    await expect(editor).toHaveCount(0);
  });

  test('trạng thái rỗng', async ({ page }) => {
    await page.goto(`${URL}&inbox=empty`);
    await expect(page.getByTestId('conv-empty')).toContainText('Chưa có hội thoại');
  });

  test('390: danh sách → chat → quay lại, không tràn ngang, vùng chạm ≥ 44px', async ({ page }) => {
    test.skip(!isMobile(page), 'chỉ mobile');
    await page.goto(URL);
    await expect(page.getByTestId('conv-list')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(page.getByTestId('conv-list').getByRole('button', { name: /Kết Nối Kênh|Mới nhất/ }));
    await page.locator('[data-conv="c_lan"] button').first().click();
    await expect(page.getByTestId('chat-panel')).toBeVisible();
    await expect(page.getByTestId('conv-list')).toBeHidden();
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(page.getByTestId('composer-send'));
    await page.getByTestId('composer-input').fill('Xin chào');
    await page.getByTestId('composer-send').click();
    await expect(page.getByTestId('thread').getByTestId('msg-out').last()).toContainText('Xin chào');
    await page.getByRole('button', { name: 'Quay lại danh sách' }).click();
    await expect(page.getByTestId('conv-list')).toBeVisible();
  });
});
