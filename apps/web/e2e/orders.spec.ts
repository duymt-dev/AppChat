import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow, expectTouchTargets, isMobile } from './support/mobile';
import { confirmPreview } from './support/confirm';

const URL = '/orders?session=authed,declared,trialSeen';

const setRole = async (page: Page, label: string) => {
  await page.getByTestId('dev-toolbar').locator('.ant-select').click();
  await page.locator('.ant-select-item-option', { hasText: label }).click();
};

test.describe('orders', () => {
  test('danh sách 2 trục: chip lọc đúng trục, cột Thanh toán + Trạng thái, kanban 4 cột, đơn sàn có badge', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await expect(page.locator('[data-order]')).toHaveCount(6);
    const lan = page.locator('[data-order="ord_290411"]');
    await expect(lan).toContainText('Đã cọc');
    await expect(lan).toContainText('Đang xử lý');
    await expect(page.locator('[data-order="ord_290405"]').getByTestId('od-src')).toHaveText('Shopee');
    const chips = page.getByTestId('od-chips');
    await chips.getByRole('button', { name: /Chờ cọc/ }).click();
    await expect(page.locator('[data-order]')).toHaveCount(1);
    await expect(page.locator('[data-order="ord_290409"]')).toBeVisible();
    await chips.getByRole('button', { name: /Đã huỷ/ }).click();
    await expect(page.locator('[data-order]')).toHaveCount(1);
    await chips.getByRole('button', { name: /Tất cả/ }).click();
    await page.getByTestId('od-search').fill('bảo an');
    await expect(page.locator('[data-order]')).toHaveCount(1);
    await page.getByTestId('od-search').fill('');
    await page.getByTestId('od-view-kanban').click();
    const board = page.getByTestId('od-kanban');
    for (const col of ['Đã thanh toán', 'Đã cọc', 'Chờ cọc', 'Đã huỷ']) await expect(board).toContainText(col);
  });

  test('tạo đơn có cọc → Chờ cọc; xác nhận → Đang xử lý; huỷ bắt buộc lý do', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.getByTestId('od-create').click();
    const form = page.getByTestId('od-form');
    await form.getByTestId('od-save').click();
    await expect(form.getByTestId('od-form-err')).toContainText('Chọn khách hàng');
    await form.getByTestId('od-contact').selectOption('ct_lan');
    await form.getByTestId('od-pick').selectOption('pd_4');
    await expect(form.getByTestId('od-total')).toHaveText('540.000₫');
    await form.getByTestId('od-deposit').fill('900000');
    await form.getByTestId('od-save').click();
    await expect(form.getByTestId('od-form-err')).toContainText('Tiền cọc không được lớn hơn');
    await form.getByTestId('od-deposit').fill('200000');
    await form.getByTestId('od-save').click();

    const drawer = page.getByTestId('od-drawer');
    await expect(drawer).toContainText('DH-290412');
    await expect(drawer.getByTestId('od-status')).toHaveText('Mới');
    await expect(drawer.getByTestId('od-pay')).toHaveText('Chờ cọc');
    await drawer.getByTestId('od-confirm').click();
    await expect(drawer.getByTestId('od-status')).toHaveText('Đang xử lý');
    await drawer.getByTestId('od-cancel-open').click();
    const box = page.getByTestId('od-cancel');
    await expect(box.getByTestId('od-cancel-ok')).toBeDisabled();
    await box.getByTestId('od-cancel-reason').fill('Khách đổi lịch');
    await box.getByTestId('od-cancel-ok').click();
    await expect(drawer.getByTestId('od-status')).toHaveText('Đã huỷ');
    await drawer.getByRole('tab', { name: 'Lịch sử' }).click();
    await expect(drawer.getByTestId('od-history')).toContainText('Huỷ đơn');
  });

  test('hoàn tất cộng điểm 10.000đ = 1 điểm; huỷ đơn đã thu sinh yêu cầu hoàn tiền; vận chuyển nhập tay', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.locator('[data-order="ord_290411"]').click();
    const drawer = page.getByTestId('od-drawer');
    await drawer.getByTestId('od-ship-carrier').fill('GHN');
    await drawer.getByTestId('od-ship-tracking').fill('GHN123456');
    await drawer.getByTestId('od-ship-save').click();
    await expect(page.getByText('Đã thực hiện: Cập nhật vận chuyển')).toBeVisible();
    await drawer.getByTestId('od-complete').click();
    await expect(drawer.getByTestId('od-status')).toHaveText('Hoàn tất');
    // 12.800.000đ → 1.280 điểm (COMMERCE §7)
    await expect(drawer.getByTestId('od-points')).toHaveText('+1280 điểm');
    await drawer.getByRole('button', { name: 'Đóng' }).first().click();

    await page.locator('[data-order="ord_290409"]').click();
    await drawer.getByTestId('od-cancel-open').click();
    await page.getByTestId('od-cancel-reason').fill('Khách không cọc');
    await page.getByTestId('od-cancel-ok').click();
    await expect(drawer.getByTestId('od-refund')).toHaveCount(0);
  });

  test('đơn từ sàn (D31): khoá dòng hàng, không tích điểm, không gửi đề nghị thanh toán', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.locator('[data-order="ord_290405"]').click();
    const drawer = page.getByTestId('od-drawer');
    await expect(drawer.getByTestId('od-locked')).toContainText('Shopee');
    await expect(drawer.getByTestId('od-locked')).toContainText('READY_TO_SHIP');
    await expect(drawer.getByTestId('od-points')).toHaveText('Đơn sàn không tích điểm');
    await expect(drawer.getByRole('button', { name: 'Đề nghị thanh toán' })).toBeDisabled();
    await drawer.getByTestId('od-complete').click();
    await expect(drawer.getByTestId('od-points')).toHaveText('Đơn sàn không tích điểm');
  });

  test('báo giá đã chốt → Đơn hàng (create_from_quote); hợp đồng đã ký → Đơn hàng (create_from_contract)', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto('/quotes?session=authed,declared,trialSeen');
    await page.locator('[data-quote="q_2041"]').click();
    // BG-2041 đã duyệt, chưa gửi → gửi khách trước (QUOTE_FLOW: approved chỉ có quote.send), rồi ghi nhận chốt khi chuyển.
    await page.getByTestId('q-drawer').getByTestId('q-send-zalo').click();
    await confirmPreview(page);
    await expect(page.getByTestId('q-drawer')).toContainText('Đã gửi');
    await page.getByTestId('q-drawer').getByTestId('q-to-order').click();
    await expect(page).toHaveURL(/\/orders$/);
    const drawer = page.getByTestId('od-drawer');
    await expect(drawer).toContainText('DH-290412');
    await expect(drawer).toContainText('BG-2041');
    await expect(drawer).toContainText('Từ báo giá');
    await drawer.getByRole('button', { name: 'Đóng' }).first().click();
    await page.goto('/contracts?session=authed,declared,trialSeen');
    await page.locator('[data-contract="ctr_1180"]').click();
    await page.getByTestId('ct-drawer').getByTestId('ct-to-order').click();
    await expect(page).toHaveURL(/\/orders$/);
    await expect(drawer).toContainText('HĐ-1180');
    await expect(drawer).toContainText('Từ hợp đồng');
  });

  test('vai trò Sales: chỉ đơn của mình; Kế toán thấy tất cả', async ({ page }) => {
    test.skip(isMobile(page), 'dev toolbar chỉ thao tác trên desktop');
    await page.goto(URL);
    await setRole(page, 'Sales');
    await expect(page.locator('[data-order]')).toHaveCount(2);
    await expect(page.getByTestId('od-sync')).toHaveCount(0);
    await setRole(page, 'Kế toán');
    await expect(page.locator('[data-order]')).toHaveCount(6);
  });

  test('390: thẻ đơn, drawer, form — không tràn ngang, vùng chạm ≥ 44px', async ({ page }) => {
    test.skip(!isMobile(page), 'chỉ mobile');
    await page.goto(URL);
    await expect(page.getByTestId('od-table').locator('[data-order]')).toHaveCount(6);
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(page.getByTestId('od-create'));
    await page.locator('[data-order="ord_290411"]').click();
    await expect(page.getByTestId('od-complete')).toBeVisible();
    await expectTouchTargets(page.getByTestId('od-complete'));
    await expectNoHorizontalOverflow(page);
    await page.getByTestId('od-drawer').getByRole('button', { name: 'Đóng' }).first().click();
    await page.getByTestId('od-create').click();
    await expect(page.getByTestId('od-form')).toBeVisible();
    await expectTouchTargets(page.getByTestId('od-save'));
    await expectNoHorizontalOverflow(page);
  });
});
