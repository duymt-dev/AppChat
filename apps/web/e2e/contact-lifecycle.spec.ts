// TIP-015f §5.3–§5.4 (mock): xoá khách → mở "Đã xoá" → khách mới xoá đứng đầu, khách mẫu quá 30 ngày hiện "Hết hạn" (không có nút) →
// khôi phục (xác nhận) → khách trở lại bảng. Tìm theo tên không dấu. Vai trò không có crm.delete không thấy nút "Đã xoá". Mobile 390: drawer
// không tràn ngang (mở ở desktop rồi thu khung — nút đầu màn ẩn ở mobile). Hộp thư (?inbox=deleted_contact): panel dấu vòng đời thay 360°.
import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow, isMobile } from './support/mobile';

const URL = '/customers?session=authed,declared,trialSeen';

const setRole = async (page: Page, label: string) => {
  await page.getByTestId('dev-toolbar').locator('.ant-select').click();
  await page.locator('.ant-select-item-option', { hasText: label }).click();
};

test.describe('contact-lifecycle', () => {
  test('xoá → thùng rác → khôi phục; khách quá hạn không khôi phục được', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.locator('[data-contact="kh_1004"] .row-dots').click();
    await page.getByRole('menuitem', { name: 'Xoá' }).click();
    await expect(page.locator('[data-contact="kh_1004"]')).toHaveCount(0);

    await page.getByTestId('crm-trash-open').click();
    const drawer = page.getByTestId('crm-trash');
    await expect(drawer.locator('[data-testid^="crm-trash-row-"]').first()).toHaveAttribute('data-testid', 'crm-trash-row-kh_1004');
    await expect(page.getByTestId('crm-trash-row-kh_deleted_old')).toContainText('Hết hạn');
    await expect(page.getByTestId('crm-trash-restore-kh_deleted_old')).toHaveCount(0);

    await page.getByTestId('crm-trash-search').fill('khach cu');
    await expect(drawer.locator('[data-testid^="crm-trash-row-"]')).toHaveCount(1);
    await page.getByTestId('crm-trash-search').fill('');

    await page.getByTestId('crm-trash-restore-kh_1004').click();
    await page.locator('.ant-modal-confirm').getByRole('button', { name: 'Khôi phục' }).click();
    await expect(page.getByTestId('crm-trash-row-kh_1004')).toHaveCount(0);
    await drawer.getByRole('button', { name: 'Đóng' }).click();
    await expect(page.locator('[data-contact="kh_1004"]')).toHaveCount(1);
  });

  test('vai trò không có quyền xoá không thấy "Đã xoá"', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await expect(page.getByTestId('crm-trash-open')).toBeVisible();
    await setRole(page, 'Sales');
    await expect(page.getByTestId('crm-trash-open')).toHaveCount(0);
  });

  test('khung 390: drawer thùng rác không tràn ngang', async ({ page }) => {
    test.skip(isMobile(page), 'mở từ nút đầu màn (ẩn ở dự án mobile) rồi thu khung');
    await page.goto(URL);
    await page.getByTestId('crm-trash-open').click();
    await expect(page.getByTestId('crm-trash')).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoHorizontalOverflow(page);
  });

  test('Hộp thư: hội thoại của khách đã xoá → panel dấu vòng đời, không Hồ sơ 360° / hành động CRM; tin vẫn hiện', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto('/inbox?session=authed,declared,trialSeen&inbox=deleted_contact');
    await expect(page.getByTestId('panel-deleted-contact')).toBeVisible();
    await expect(page.getByTestId('panel-360')).toHaveCount(0);
    await expect(page.getByTestId('deleted-contact-trash-link')).toBeVisible();
    await expect(page.getByTestId('thread').getByTestId('msg-out').first()).toBeVisible();
  });
});
