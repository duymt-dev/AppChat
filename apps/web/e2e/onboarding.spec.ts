import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, expectTouchTargets, isMobile } from './support/mobile';

test.describe('onboarding', () => {
  test('khai báo DN (tra MST) → khởi tạo → chào mừng trial → vào app', async ({ page }) => {
    await page.goto('/dashboard?session=authed');
    const modal = page.getByTestId('declare-modal');
    await expect(modal).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(modal).toBeVisible(); // không đóng được
    await expect(page.getByTestId('declare-next')).toBeDisabled();
    await page.getByTestId('declare-id').fill('0312 345 678');
    await page.getByTestId('declare-lookup').click();
    await expect(page.getByTestId('declare-name')).toHaveValue(/MEDIASOFT/);
    await page.getByTestId('declare-next').click();
    await page.getByTestId('declare-field').fill('Bán lẻ mỹ phẩm');
    await page.getByTestId('declare-submit').click();
    await expect(page.getByTestId('provisioning')).toBeVisible();
    await expect(page.getByTestId('trial-welcome')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('trial-welcome')).toContainText('15 ngày');
    await page.getByTestId('trial-start').click();
    await expect(page.getByTestId('trial-welcome')).toBeHidden();
    await expect(page.getByTestId('app-shell')).toBeVisible();
  });

  test('khai báo cá nhân: VNeID 12 số', async ({ page }) => {
    await page.goto('/dashboard?session=authed');
    await page.getByTestId('declare-type-individual').click();
    await page.getByTestId('declare-name').fill('Nguyễn Văn A');
    await page.getByTestId('declare-id').fill('0010990123');
    await expect(page.getByTestId('declare-next')).toBeDisabled();
    await page.getByTestId('declare-id').fill('001099012345');
    await page.getByTestId('declare-next').click();
    await expect(page.getByTestId('declare-step-2')).toBeVisible();
  });

  test('hết trial: thông báo đóng được', async ({ page }) => {
    await page.goto('/dashboard?session=authed,declared,trialSeen,expired');
    await expect(page.getByTestId('trial-expired')).toBeVisible();
    await page.getByTestId('trial-expired-close').click();
    await expect(page.getByTestId('trial-expired')).toBeHidden();
  });

  test('chưa đăng nhập → /login', async ({ page }) => {
    await page.goto('/dashboard?session=');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('390: popup toàn màn, không tràn ngang, vùng chạm ≥ 44px', async ({ page }) => {
    test.skip(!isMobile(page), 'chỉ mobile');
    await page.goto('/dashboard?session=authed');
    const card = page.getByTestId('onb-card');
    await expect(card).toBeVisible();
    expect((await card.boundingBox())!.width).toBe(390);
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(page.locator('[data-testid^="declare-type-"], [data-testid="declare-lookup"], [data-testid="declare-next"]'));
    await page.goto('/dashboard?session=authed,declared');
    await expect(page.getByTestId('trial-welcome')).toBeVisible({ timeout: 10_000 });
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(page.locator('[data-testid="trial-start"], [data-testid="trial-pricing"]'));
  });
});
