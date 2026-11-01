import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow, expectTouchTargets, isMobile } from './support/mobile';

const URL = '/products?session=authed,declared,trialSeen';

const setRole = async (page: Page, label: string) => {
  await page.getByTestId('dev-toolbar').locator('.ant-select').click();
  await page.locator('.ant-select-item-option', { hasText: label }).click();
};

test.describe('products', () => {
  test('danh sách: lọc danh mục, tìm, kanban theo danh mục, drawer 5 tab', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await expect(page.locator('[data-product]')).toHaveCount(6);
    await expect(page.getByTestId('pd-sources')).toContainText('Sắp có');
    await page.getByTestId('pd-cats').getByRole('button', { name: 'Sản phẩm', exact: true }).click();
    await expect(page.locator('[data-product]')).toHaveCount(2);
    await page.getByTestId('pd-cats').getByRole('button', { name: 'Tất cả' }).click();
    await page.getByTestId('pd-search').fill('visia');
    await expect(page.locator('[data-product]')).toHaveCount(1);
    await page.getByTestId('pd-search').fill('');
    await page.getByTestId('pd-view-kanban').click();
    await expect(page.getByTestId('pd-kanban')).toBeVisible();
    await page.locator('[data-product="pd_1"]').click();
    const drawer = page.getByTestId('pd-drawer');
    await expect(drawer).toContainText('HIFU nâng cơ 8 buổi');
    await drawer.getByRole('tab', { name: 'CRM' }).click();
    await expect(drawer).toContainText('Khách mua nhiều nhất');
    await drawer.getByRole('tab', { name: 'Lịch sử' }).click();
    await expect(drawer.getByTestId('pd-history')).toContainText('Tạo sản phẩm');
  });

  test('TIP-027: điều chỉnh tồn âm → cảnh báo, lịch sử có mục kho; sửa giá ghi lịch sử', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.locator('[data-product="pd_5"]').click();
    const drawer = page.getByTestId('pd-drawer');
    await drawer.getByTestId('pd-stock-open').click();
    const m = page.getByTestId('pd-stock');
    await expect(m.getByTestId('pd-stock-save')).toBeDisabled();
    await m.getByTestId('pd-stock-delta').fill('-999');
    await m.getByTestId('pd-stock-reason').fill('Kiểm kê');
    await m.getByTestId('pd-stock-save').click();
    await expect(page.getByText('đã chạm ngưỡng cảnh báo')).toBeVisible();
    await expect(drawer.getByTestId('pd-stock-value')).toContainText('sắp hết');
    await drawer.getByRole('tab', { name: 'Lịch sử' }).click();
    await expect(drawer.getByTestId('pd-history').locator('[data-kind="stock"]').first()).toContainText(
      'Kiểm kê',
    );
    await drawer.getByRole('tab', { name: 'Tổng quan' }).click();
    await drawer.getByTestId('pd-edit').click();
    const form = page.getByTestId('pd-form');
    await form.getByTestId('pd-f-price').fill('700000');
    await form.getByTestId('pd-save').click();
    await expect(form).toHaveCount(0);
    await drawer.getByRole('tab', { name: 'Lịch sử' }).click();
    await expect(drawer.getByTestId('pd-history').locator('[data-kind="price"]')).toHaveCount(1);
    await drawer.getByRole('button', { name: 'Đóng' }).first().click();
    await page.locator('[data-product="pd_4"]').click();
    await expect(drawer).toContainText('Khám da soi VISIA');
    await expect(page.getByTestId('pd-stock-open')).toHaveCount(0);
  });

  test('thêm sản phẩm: đổi loại đổi khối nhập, thuộc tính sinh biến thể, danh mục mới, lưu qua action', async ({
    page,
  }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.getByTestId('pd-add').click();
    const form = page.getByTestId('pd-form');
    await form.getByTestId('pd-save').click();
    await expect(form).toContainText('Nhập tên và giá bán');
    await expect(form.getByTestId('pd-f-sku')).toBeVisible();
    await form.getByTestId('pd-f-type').selectOption('service');
    await expect(form.getByTestId('pd-f-duration')).toBeVisible();
    await expect(form.getByTestId('pd-f-sku')).toHaveCount(0);
    await form.getByTestId('pd-f-type').selectOption('combo');
    await form.getByTestId('pd-combo-add').click();
    await form.getByTestId('pd-f-type').selectOption('physical');
    await form.getByTestId('pd-attr-add').click();
    await form.getByTestId('pd-attr-name').fill('Màu');
    await form.getByTestId('pd-attr-vals').fill('Đỏ/Đen');
    await form.getByTestId('pd-attr-add').click();
    await form.getByTestId('pd-attr-name').nth(1).fill('Size');
    await form.getByTestId('pd-attr-vals').nth(1).fill('S/M/L');
    await expect(form.getByTestId('pd-variants')).toContainText('Đỏ · S');
    await expect(form).toContainText('6 tổ hợp');
    await form.getByTestId('pd-newcat').click();
    await form.getByTestId('pd-newcat-name').fill('Phụ kiện');
    await form.getByTestId('pd-newcat-save').click();
    await expect(form.getByTestId('pd-f-category')).toHaveValue('Phụ kiện');
    await form.getByTestId('pd-f-name').fill('Khăn spa cotton');
    await form.getByTestId('pd-f-price').fill('150.000');
    await expect(form.getByTestId('pd-f-price')).toHaveValue('150000');
    await form.getByTestId('cf-in-warranty').fill('6 tháng');
    await form.getByTestId('pd-save').click();
    await expect(form).toHaveCount(0);
    await expect(page.locator('[data-product]')).toHaveCount(7);
    await expect(page.locator('[data-product]').first()).toContainText('Khăn spa cotton');
    await expect(page.getByTestId('pd-cats')).toContainText('Phụ kiện');
  });

  test('sửa và xoá từ menu dòng; giá vốn ẩn với Sales', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await expect(page.getByRole('columnheader', { name: 'Giá vốn' })).toBeVisible();
    await page.locator('[data-product="pd_4"]').getByRole('button', { name: 'Thao tác' }).click();
    await page.getByRole('menuitem', { name: 'Sửa' }).click();
    const form = page.getByTestId('pd-form');
    await expect(form.getByTestId('pd-f-name')).toHaveValue('Khám da soi VISIA');
    await form.getByTestId('pd-f-price').fill('550000');
    await form.getByTestId('pd-save').click();
    await expect(page.locator('[data-product="pd_4"]')).toContainText('550.000');
    await page.locator('[data-product="pd_6"]').getByRole('button', { name: 'Thao tác' }).click();
    await page.getByRole('menuitem', { name: 'Xoá' }).click();
    await expect(page.locator('[data-product]')).toHaveCount(5);
    await setRole(page, 'Sales');
    await expect(page.getByRole('columnheader', { name: 'Giá vốn' })).toHaveCount(0);
    await expect(page.getByTestId('pd-add')).toHaveCount(0);
  });

  test('390: thẻ sản phẩm, drawer, form toàn màn, không tràn ngang, vùng chạm ≥ 44px', async ({ page }) => {
    test.skip(!isMobile(page), 'chỉ mobile');
    await page.goto(URL);
    await expect(page.getByTestId('pd-table').locator('[data-product]')).toHaveCount(6);
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(page.getByTestId('pd-add'));
    await page.locator('[data-product="pd_1"]').click();
    await expect(page.getByTestId('pd-drawer')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByTestId('pd-drawer').getByRole('button', { name: 'Đóng' }).first().click();
    await page.getByTestId('pd-add').click();
    await expect(page.getByTestId('pd-form')).toBeVisible();
    await expectTouchTargets(page.getByTestId('pd-save'));
    await expectNoHorizontalOverflow(page);
  });
});
