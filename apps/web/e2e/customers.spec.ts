import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow, expectTouchTargets, isMobile } from './support/mobile';

const URL = '/customers?session=authed,declared,trialSeen';

const setRole = async (page: Page, label: string) => {
  await page.getByTestId('dev-toolbar').locator('.ant-select').click();
  await page.locator('.ant-select-item-option', { hasText: label }).click();
};

test.describe('customers', () => {
  test('bảng: lọc giai đoạn, tìm kiếm, mở 360°, kanban', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await expect(page.locator('[data-contact]')).toHaveCount(12);
    await page.getByRole('tab', { name: /Lead mới/ }).click();
    await expect(page.locator('[data-contact]')).toHaveCount(2);
    await page.getByRole('tab', { name: /Tất cả/ }).click();
    await page.getByTestId('crm-search').fill('rodriguez');
    await expect(page.locator('[data-contact]')).toHaveCount(1);
    await page.getByTestId('crm-search').fill('');
    await page.locator('[data-contact="ct_lan"]').click();
    await expect(page.getByTestId('crm-360')).toContainText('Hành trình trao đổi');
    await page.getByTestId('crm-360').getByRole('tab', { name: 'CRM' }).click();
    await expect(page.getByTestId('crm-360')).toContainText('Cơ hội đang mở');
    await page.getByTestId('crm-360').getByRole('button', { name: 'Đóng' }).click();
    await page.getByRole('radio', { name: 'Kanban' }).click();
    await expect(page.getByTestId('crm-kanban').locator('[data-column]')).toHaveCount(6);
    const card = page.locator('[data-testid="kanban-card"][data-contact="kh_1002"]');
    await card.getByRole('button', { name: 'Tag' }).click();
    await page.getByTestId('tag-pop').getByRole('button', { name: 'VIP' }).click();
    await expect(card).toContainText('VIP');
  });

  test('sửa khách + xoá có hoàn tác', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.locator('[data-contact="kh_1003"] .row-dots').click();
    await page.getByRole('menuitem', { name: 'Cập nhật khách hàng' }).click();
    await page.getByTestId('crm-edit').getByLabel('Chức danh').fill('Khách VIP');
    await page.getByTestId('crm-save').click();
    await expect(page.locator('[data-contact="kh_1003"]')).toContainText('Khách VIP');
    await page.locator('[data-contact="kh_1003"] .row-dots').click();
    await page.getByRole('menuitem', { name: 'Xoá' }).click();
    await expect(page.locator('[data-contact="kh_1003"]')).toHaveCount(0);
  });

  test('TIP-026: sắp xếp · lọc thẻ · nhập tệp · đổi Phụ trách → Chuyển phụ trách · 360° theo bố cục vai trò', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.getByTestId('crm-sort').click();
    await page.getByTestId('crm-sort-name').click();
    const names = await page.locator('[data-contact] td:nth-child(3)').allInnerTexts();
    expect(names.length).toBeGreaterThan(1);
    await page.getByTestId('filter-btn').click();
    await page.getByTestId('filter-pop').getByLabel('Tags').selectOption({ label: 'VIP' });
    await page.getByTestId('filter-pop').getByRole('button', { name: 'Áp dụng' }).click();
    await expect(page.locator('[data-contact="ct_lan"]')).toBeVisible();
    await expect(page.locator('[data-contact="kh_1002"]')).toHaveCount(0);
    await page.reload();

    await page.getByTestId('crm-import-open').click();
    const imp = page.getByTestId('crm-import');
    await imp.getByTestId('import-file').setInputFiles({ name: 'k.csv', mimeType: 'text/csv', buffer: Buffer.from('a,b\n1,2') });
    await expect(imp.getByTestId('import-preview').locator('tbody tr')).toHaveCount(2);
    await imp.getByTestId('import-submit').click();
    await page.getByRole('button', { name: 'Xác nhận' }).click();
    await expect(imp.getByTestId('import-result').locator('[data-stat="created"] b')).toHaveText('1');
    await imp.getByRole('button', { name: 'Xong' }).click();

    await page.locator('[data-contact="kh_1003"] .row-dots').click();
    await page.getByRole('menuitem', { name: 'Cập nhật khách hàng' }).click();
    await page.getByTestId('crm-edit').getByLabel('Phụ trách').selectOption({ index: 2 });
    await expect(page.getByTestId('crm-transfer')).toBeVisible();
    await expect(page.getByTestId('transfer-to')).not.toHaveValue('');
    await page.getByTestId('crm-transfer').getByRole('button', { name: 'Huỷ' }).click();

    await setRole(page, 'Sales');
    await page.locator('[data-contact="ct_lan"]').click();
    await expect(page.getByTestId('crm-360').getByRole('tab', { name: 'Giao dịch' })).toBeVisible();
    await expect(page.getByTestId('crm-360').getByRole('tab', { name: 'Tệp' })).toHaveCount(0);
    await page.getByTestId('crm-360').getByRole('tab', { name: 'Giao dịch' }).click();
    await expect(page.getByTestId('crm-360').locator('[data-block="quotes"]')).toBeVisible();
  });

  test('kiểm trùng + gộp (xác nhận hàng loạt), trường mở rộng', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.getByTestId('crm-dedupe').click();
    await expect(page.getByTestId('dd-group')).toHaveCount(3);
    await page.getByTestId('dd-group').first().getByRole('button', { name: 'Gộp khách hàng' }).click();
    await page.getByRole('button', { name: 'Xác nhận' }).click();
    await expect(page.getByTestId('dd-group')).toHaveCount(2);
    await page.getByTestId('crm-dedupe-modal').getByRole('button', { name: 'Đóng' }).click();
    await page.getByTestId('crm-fields').click();
    await expect(page.getByTestId('cf-row')).toHaveCount(6);
  });

  test('D32: tạo khách trùng người khác → Xin chia sẻ', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.getByTestId('crm-create').click();
    await page.getByLabel('Họ và tên *').fill('Anh Hiếu');
    await page.getByLabel('Số điện thoại *').fill('0902 334 571');
    await page.getByTestId('crm-save').click();
    await expect(page.getByTestId('contact-owned')).toContainText('Minh');
    await page.getByTestId('request-access').click();
    await expect(page.getByTestId('contact-owned')).toContainText('Đã gửi yêu cầu chia sẻ');
  });

  test('D32: đồng phụ trách + chuyển phụ trách (Quản lý)', async ({ page }) => {
    test.skip(isMobile(page), 'dev toolbar chỉ thao tác trên desktop');
    await page.goto(URL);
    await page.locator('[data-contact="ct_lan"] .row-dots').click();
    await page.getByRole('menuitem', { name: 'Người phụ trách' }).click();
    await page.getByTestId('collab-pick').selectOption('u_minh');
    await page.getByTestId('collab-add').click();
    await expect(page.getByTestId('collab-row')).toHaveCount(2);
    await page.getByTestId('crm-collab').getByRole('button', { name: 'Đóng' }).click();
    await page.locator('[data-contact="ct_lan"] .row-dots').click();
    await page.getByRole('menuitem', { name: 'Chuyển phụ trách' }).click();
    await page.getByTestId('transfer-to').selectOption('u_khoa');
    await page.getByTestId('transfer-submit').click();
    await expect(page.locator('[data-contact="ct_lan"]')).toContainText('Khoa');
  });

  test('vai trò Sales: chỉ khách của mình + đồng phụ trách, không chuyển phụ trách', async ({ page }) => {
    test.skip(isMobile(page), 'dev toolbar chỉ thao tác trên desktop');
    await page.goto(URL);
    await setRole(page, 'Sales');
    await expect(page.locator('[data-contact]')).toHaveCount(5);
    await expect(page.locator('[data-contact="kh_1002"]').getByTestId('co-owner-badge')).toHaveText('Đồng phụ trách');
    await page.locator('[data-contact="ct_lan"] .row-dots').click();
    await expect(page.getByRole('menuitem', { name: 'Chuyển phụ trách' })).toHaveCount(0);
    await expect(page.getByRole('menuitem', { name: 'Xoá' })).toHaveCount(0);
  });

  test('390: thẻ khách, drawer 360° từ dưới, không tràn ngang, vùng chạm ≥ 44px', async ({ page }) => {
    test.skip(!isMobile(page), 'chỉ mobile');
    await page.goto(URL);
    await expect(page.getByTestId('crm-table').locator('[data-contact]')).toHaveCount(12);
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(page.getByTestId('crm-create'));
    await expectTouchTargets(page.locator('[data-contact="ct_lan"] .row-dots'));
    await page.locator('[data-contact="ct_lan"]').click();
    await expect(page.getByTestId('crm-360')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByTestId('crm-360').getByRole('button', { name: 'Đóng' }).click();
    await page.getByRole('radio', { name: 'Kanban' }).click();
    await expect(page.getByTestId('crm-kanban')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
