import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow, expectTouchTargets, isMobile } from './support/mobile';

const URL = '/invoices?session=authed,declared,trialSeen';

const setRole = async (page: Page, label: string) => {
  await page.getByTestId('dev-toolbar').locator('.ant-select').click();
  await page.locator('.ant-select-item-option', { hasText: label }).click();
};

test.describe('invoices', () => {
  test('danh sách "Đề nghị thanh toán" (COMMERCE §5): mã TT-, 4 thẻ số liệu, tìm không dấu', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await expect(page.getByText('Đề nghị thanh toán', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Hóa đơn', { exact: true })).toHaveCount(0);
    await expect(page.locator('[data-invoice]')).toHaveCount(5);
    await expect(page.locator('[data-invoice="inv_2039"]')).toContainText('TT-002039');
    await expect(page.locator('[data-invoice="inv_2039"]')).toContainText('Quá hạn');
    await expect(page.getByTestId('iv-stat-overdue')).toHaveText('12tr');
    await page.getByTestId('iv-search').fill('bao an');
    await expect(page.locator('[data-invoice]')).toHaveCount(1);
    await expect(page.locator('[data-invoice="inv_2040"]')).toBeVisible();
  });

  test('chi tiết: VietQR = còn phải thu + nội dung mã TT; ghi chú không thay hoá đơn GTGT', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.locator('[data-invoice="inv_2039"]').click();
    const drawer = page.getByTestId('iv-drawer');
    await expect(drawer.getByTestId('iv-pct')).toHaveText('45%');
    await expect(drawer.getByTestId('iv-left')).toContainText('12.000.000₫');
    const qr = drawer.getByTestId('iv-qr');
    await expect(qr.getByTestId('iv-qr-amount')).toHaveText('12.000.000₫');
    await expect(qr.getByTestId('iv-qr-content')).toHaveText('TT002039');
    await expect(qr.locator('canvas, svg').first()).toBeVisible();
    await expect(drawer.getByTestId('iv-not-vat')).toHaveText('Chứng từ này không thay thế hoá đơn giá trị gia tăng');
    await drawer.getByRole('button', { name: 'Đóng' }).first().click();
    // đã thu đủ → không còn QR
    await page.locator('[data-invoice="inv_2041"]').click();
    await expect(drawer.getByTestId('iv-status')).toHaveText('Đã thanh toán');
    await expect(drawer.getByTestId('iv-qr')).toHaveCount(0);
    await expect(drawer.getByTestId('iv-record')).toBeDisabled();
  });

  test('ghi nhận thanh toán: chặn vượt số còn lại; một phần → đủ → Đã thanh toán + phiếu thu', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.locator('[data-invoice="inv_2039"]').click();
    const drawer = page.getByTestId('iv-drawer');
    await drawer.getByTestId('iv-record').click();
    const box = page.getByTestId('iv-record-box');
    await expect(box.getByTestId('iv-record-amount')).toHaveValue('12000000');
    await box.getByTestId('iv-record-amount').fill('13000000');
    await box.getByTestId('iv-record-ok').click();
    await expect(box.getByTestId('iv-record-err')).toContainText('không được lớn hơn');
    await box.getByTestId('iv-record-amount').fill('2000000');
    await box.getByTestId('iv-record-method').selectOption('cash');
    await box.getByTestId('iv-record-ok').click();
    await expect(page.getByText(/Đã ghi nhận · PT-/)).toBeVisible();
    await expect(drawer.getByTestId('iv-left')).toContainText('10.000.000₫');
    await expect(drawer.getByTestId('iv-status')).toHaveText('Quá hạn');
    await expect(drawer.getByTestId('iv-payments')).toContainText('Tiền mặt');
    await drawer.getByTestId('iv-record').click();
    await page.getByTestId('iv-record-ok').click();
    await expect(drawer.getByTestId('iv-status')).toHaveText('Đã thanh toán');
    await expect(drawer.getByTestId('iv-pct')).toHaveText('100%');
    await drawer.getByRole('tab', { name: 'Lịch sử' }).click();
    await expect(drawer.getByTestId('iv-history')).toContainText('Ghi nhận thanh toán');
  });

  test('từ đơn hàng: tạo đề nghị cọc (≤ đơn còn phải thu) → Nháp → gửi Zalo → ghi nhận → đơn cập nhật đã thu', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto('/orders?session=authed,declared,trialSeen');
    await page.locator('[data-order="ord_290409"]').click();
    await page.getByTestId('od-drawer').getByRole('button', { name: 'Đề nghị thanh toán' }).click();
    await expect(page).toHaveURL(/\/invoices$/);
    const form = page.getByTestId('iv-form');
    await expect(form.getByTestId('iv-order')).toHaveValue('ord_290409');
    await expect(form.getByTestId('iv-contact')).toHaveValue('ct_vy');
    await expect(form.getByTestId('iv-order-left')).toContainText('9.500.000₫');
    await expect(form.getByTestId('iv-due')).toHaveValue('2026-07-01');
    await form.getByTestId('iv-kind').selectOption('deposit');
    await form.getByTestId('iv-amount').fill('9600000');
    await form.getByTestId('iv-save').click();
    await expect(form.getByTestId('iv-form-err')).toContainText('không được lớn hơn');
    await form.getByTestId('iv-amount').fill('2850000');
    await form.getByTestId('iv-save').click();

    const drawer = page.getByTestId('iv-drawer');
    await expect(drawer).toContainText('TT-002042');
    await expect(drawer.getByTestId('iv-status')).toHaveText('Nháp');
    await expect(drawer.getByTestId('iv-qr')).toHaveCount(0);
    await drawer.getByTestId('iv-send').click();
    await expect(drawer.getByTestId('iv-status')).toHaveText('Đã gửi');
    await expect(drawer.getByTestId('iv-qr-content')).toHaveText('TT002042');
    await drawer.getByTestId('iv-record').click();
    await page.getByTestId('iv-record-ok').click();
    await expect(drawer.getByTestId('iv-status')).toHaveText('Đã thanh toán');

    // điều hướng phía client (giữ store mock trong phiên) → pay_status đơn tính lại từ khoản thu
    await drawer.getByRole('tab', { name: 'CRM' }).click();
    await drawer.getByRole('button', { name: /Đơn bán hàng/ }).click();
    await expect(page).toHaveURL(/\/orders$/);
    await page.locator('[data-order="ord_290409"]').click();
    await expect(page.getByTestId('od-drawer').getByTestId('od-pay')).toHaveText('Đã cọc');
  });

  test('cần đối soát: khớp giao dịch thiếu mã vào đề nghị; huỷ chỉ khi chưa thu', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.getByTestId('iv-reconcile-open').click();
    const rec = page.getByTestId('iv-reconcile');
    const tx = rec.getByTestId('iv-tx-btx_881');
    await expect(tx).toContainText('Thiếu mã TT');
    await expect(tx.getByTestId('iv-tx-pick')).toHaveValue('inv_2037');
    await tx.getByTestId('iv-tx-match').click();
    await expect(rec.getByTestId('iv-tx-btx_881')).toHaveCount(0);
    await rec.getByRole('button', { name: 'Đóng' }).first().click();
    await page.locator('[data-invoice="inv_2037"]').click();
    const drawer = page.getByTestId('iv-drawer');
    await expect(drawer.getByTestId('iv-status')).toHaveText('Đã thanh toán');
    await expect(drawer.getByTestId('iv-void-open')).toHaveCount(0);
    await drawer.getByRole('button', { name: 'Đóng' }).first().click();
    await page.locator('[data-invoice="inv_2040"]').click();
    await drawer.getByTestId('iv-void-open').click();
    await expect(page.getByTestId('iv-void-ok')).toBeDisabled();
    await page.getByTestId('iv-void-reason').fill('Khách gộp vào đợt sau');
    await page.getByTestId('iv-void-ok').click();
    await expect(drawer.getByTestId('iv-status')).toHaveText('Đã huỷ');
  });

  test('vai trò Sales: chỉ đề nghị của mình, không ghi nhận / đối soát; Kế toán ghi nhận được', async ({ page }) => {
    test.skip(isMobile(page), 'dev toolbar chỉ thao tác trên desktop');
    await page.goto(URL);
    await setRole(page, 'Sales');
    await expect(page.locator('[data-invoice]')).toHaveCount(2);
    await expect(page.getByTestId('iv-reconcile-open')).toHaveCount(0);
    await page.locator('[data-invoice]').first().click();
    await expect(page.getByTestId('iv-drawer').getByTestId('iv-record')).toBeDisabled();
    await page.getByTestId('iv-drawer').getByRole('button', { name: 'Đóng' }).first().click();
    await setRole(page, 'Kế toán');
    await expect(page.locator('[data-invoice]')).toHaveCount(5);
    await expect(page.getByTestId('iv-reconcile-open')).toBeVisible();
  });

  test('390: thẻ đề nghị, drawer có VietQR, ghi nhận — không tràn ngang, vùng chạm ≥ 44px', async ({ page }) => {
    test.skip(!isMobile(page), 'chỉ mobile');
    await page.goto(URL);
    await expect(page.getByTestId('iv-table').locator('[data-invoice]')).toHaveCount(5);
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(page.getByTestId('iv-create'));
    await page.locator('[data-invoice="inv_2039"]').click();
    await expect(page.getByTestId('iv-qr')).toBeVisible();
    await expectTouchTargets(page.getByTestId('iv-record'));
    await expectNoHorizontalOverflow(page);
    await page.getByTestId('iv-record').click();
    await expect(page.getByTestId('iv-record-box')).toBeVisible();
    await expectTouchTargets(page.getByTestId('iv-record-ok'));
    await page.getByTestId('iv-record-ok').click();
    await expect(page.getByTestId('iv-status')).toHaveText('Đã thanh toán');
    await expectNoHorizontalOverflow(page);
  });
});
