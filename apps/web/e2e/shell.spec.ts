import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, expectTouchTargets, isMobile } from './support/mobile';

test.describe('shell', () => {
  test('điều hướng chính chạy được', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByTestId('app-shell')).toBeVisible();
    if (isMobile(page)) {
      await expect(page.getByTestId('nav-rail')).toBeHidden();
      const bar = page.getByTestId('mobile-tabbar');
      await expect(bar).toBeVisible();
      await bar.getByRole('button').nth(1).click();
      await expect(page).toHaveURL(/\/inbox$/);
      await page.getByTestId('mobile-more').click();
      await expect(page.locator('.ant-drawer')).toBeVisible();
    } else {
      await expect(page.getByTestId('mobile-tabbar')).toBeHidden();
      await page.locator('[data-nav="inbox"]').click();
      await expect(page).toHaveURL(/\/inbox$/);
      await page.getByTestId('rail-toggle').click();
      await expect(page.getByTestId('nav-rail')).toHaveCSS('width', '230px');
    }
  });

  test('mobile 390: không tràn ngang, vùng chạm ≥ 44px', async ({ page }) => {
    test.skip(!isMobile(page), 'chỉ mobile');
    await page.goto('/dashboard');
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(page.getByTestId('mobile-tabbar').getByRole('button'));
  });

  test('desktop: thông báo, menu avatar, flyout CRM, dock Trợ lý', async ({ page }) => {
    test.skip(isMobile(page), 'chỉ desktop');
    await page.goto('/dashboard');
    await page.getByTestId('rail-notifications').click();
    await expect(page.getByTestId('notifications-popover')).toBeVisible();
    await page.getByTestId('rail-user').click();
    await expect(page.getByTestId('user-menu')).toBeVisible();
    await expect(page.getByTestId('user-menu')).not.toContainText('Đối tác tiếp thị');
    await page.locator('[data-nav="customers"]').hover();
    await expect(page.getByTestId('flyout-crm')).toContainText('Đề nghị thanh toán');
    await expect(page.getByTestId('flyout-crm')).not.toContainText('Hóa đơn');
    await page.keyboard.press('Control+k');
    await expect(page.getByTestId('assistant-dock')).toBeVisible();
  });

  test('dev toolbar đổi vai trò → rail ẩn mục ngoài quyền', async ({ page }) => {
    test.skip(isMobile(page), 'chỉ desktop');
    await page.goto('/dashboard');
    await expect(page.locator('[data-nav="inbox"]')).toBeVisible();
    await page.getByTestId('dev-toolbar').locator('.ant-select').click();
    await page.locator('.ant-select-item-option', { hasText: 'Kế toán' }).click();
    await expect(page.locator('[data-nav="inbox"]')).toHaveCount(0);
    await expect(page.locator('[data-nav="agents"]')).toHaveCount(0);
  });
});
