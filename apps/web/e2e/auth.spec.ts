import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow, expectTouchTargets } from './support/mobile';

const typeOtp = async (page: Page) => {
  const cells = page.getByTestId('otp-input').locator('input');
  for (let i = 0; i < 6; i++) await cells.nth(i).fill(String((i * 2 + 2) % 10));
};

test.describe('auth', () => {
  test('đăng nhập email + mật khẩu → vào app', async ({ page }) => {
    await page.goto('/login?session=');
    await expect(page.getByTestId('auth-screen')).toBeVisible();
    await expect(page.getByText('Google')).toHaveCount(0); // ẩn social login (D-OTP)
    await page.getByTestId('login-email').fill('tramnt@appchat.vn');
    await page.getByTestId('login-password-input').fill('matkhau123');
    await page.getByTestId('login-submit').click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('đăng nhập bằng mã OTP email', async ({ page }) => {
    await page.goto('/login?session=declared,trialSeen');
    await page.getByText('← Đăng nhập bằng mã OTP').click();
    await page.getByTestId('login-email').fill('tramnt@appchat.vn');
    await page.getByTestId('login-send-otp').click();
    await expect(page.getByTestId('login-otp-sent')).toContainText('tramnt@appchat.vn');
    await typeOtp(page);
    await page.getByTestId('login-verify').click();
    await expect(page.getByTestId('app-shell')).toBeVisible();
  });

  test('đăng ký 3 bước → popup khai báo', async ({ page }) => {
    await page.goto('/register?session=');
    await expect(page.getByTestId('register-chan-zalo')).toBeDisabled();
    await page.getByTestId('register-email').fill('moi@congty.vn');
    await page.getByTestId('register-send').click();
    await expect(page.getByTestId('register-step-2')).toBeVisible();
    await typeOtp(page);
    await page.getByTestId('register-verify').click();
    await expect(page.getByTestId('register-step-3')).toContainText('moi@congty.vn');
    await page.getByTestId('register-enter').click();
    await expect(page.getByTestId('declare-modal')).toBeVisible();
  });

  test('quên mật khẩu → đã gửi; đặt lại mật khẩu', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.getByTestId('forgot-email').fill('ai@do.vn');
    await page.getByTestId('forgot-submit').click();
    await expect(page.getByTestId('forgot-sent')).toContainText('ai@do.vn');
    await page.goto('/reset-password?token=abc');
    await page.getByTestId('reset-password').fill('matkhau-moi');
    await page.getByTestId('reset-password2').fill('khac');
    await expect(page.getByTestId('reset-submit')).toBeDisabled();
    await page.getByTestId('reset-password2').fill('matkhau-moi');
    await page.getByTestId('reset-submit').click();
    await expect(page.getByTestId('reset-done')).toBeVisible();
  });

  test('390: không tràn ngang, ô nhập + nút ≥ 44px', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 1440) >= 768, 'chỉ mobile');
    for (const url of ['/login?session=', '/register?session=', '/forgot-password', '/reset-password?token=x']) {
      await page.goto(url);
      await expectNoHorizontalOverflow(page);
      await expectTouchTargets(page.getByTestId('auth-screen').locator('input:not([type=checkbox]), button[type=submit], [data-testid$="-send"]'));
    }
  });
});
