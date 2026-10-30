// TIP-011 AC9 — E2E chế độ http trên backend thật (pnpm e2e:http): đăng ký OTP → khai báo (tra MST) → khởi tạo workspace
// (worker thật) → chào mừng trial 15 ngày → vào app; đăng xuất → đăng nhập OTP vào thẳng app; quên mật khẩu → link → đặt lại →
// đăng nhập mật khẩu. OTP / link đọc từ thư dev (MAIL_CONSOLE_DIR).
import { expect, test } from '@playwright/test';
import { declare, freshEmail, mailMatch, otpOf, register, spoofIp, typeOtp } from './support';

test.describe('auth + onboarding (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('đăng ký → khai báo → khởi tạo → chào mừng trial → vào app; đăng xuất → đăng nhập OTP vào thẳng app', async ({ page }) => {
    const email = freshEmail('reg');
    await register(page, email);
    await declare(page);
    await expect(page.getByTestId('trial-welcome')).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId('trial-welcome')).toContainText('15 ngày');
    await page.getByTestId('trial-start').click();
    await expect(page.getByTestId('trial-welcome')).toBeHidden();
    await expect(page.getByTestId('app-shell')).toBeVisible();

    // Tải lại trang: access token trong bộ nhớ mất → transport làm mới bằng cookie, vẫn trong app, không hiện lại chào mừng.
    await page.reload();
    await expect(page.getByTestId('app-shell')).toBeVisible();
    await expect(page.getByTestId('trial-welcome')).toBeHidden();

    // Đăng xuất (cookie refresh bị thu hồi) → vào app bị đưa về /login.
    await page.request.post('/api/v1/auth/logout');
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login$/);
    await page.getByText('← Đăng nhập bằng mã OTP').click();
    await page.getByTestId('login-email').fill(email);
    await page.getByTestId('login-send-otp').click();
    await expect(page.getByTestId('login-otp-sent')).toContainText(email);
    await typeOtp(page, await otpOf(email));
    await page.getByTestId('login-verify').click();
    await expect(page.getByTestId('app-shell')).toBeVisible();
    await expect(page.getByTestId('declare-modal')).toBeHidden();
  });

  test('quên mật khẩu → link email → đặt lại → đăng nhập bằng mật khẩu', async ({ page }) => {
    const email = freshEmail('pw');
    await register(page, email);
    await expect(page.getByTestId('declare-modal')).toBeVisible();
    await page.request.post('/api/v1/auth/logout');

    await page.goto('/forgot-password');
    await page.getByTestId('forgot-email').fill(email);
    await page.getByTestId('forgot-submit').click();
    await expect(page.getByTestId('forgot-sent')).toContainText(email);
    const link = await mailMatch(email, /(\/reset-password\?token=[^\s&]+)/);
    await page.goto(link);
    await page.getByTestId('reset-password').fill('matkhau-moi-123');
    await page.getByTestId('reset-password2').fill('matkhau-moi-123');
    await page.getByTestId('reset-submit').click();
    await expect(page.getByTestId('reset-done')).toBeVisible();

    await page.goto('/login');
    await page.getByTestId('login-email').fill(email);
    await page.getByTestId('login-password-input').fill('matkhau-moi-123');
    await page.getByTestId('login-submit').click();
    await expect(page).toHaveURL(/\/dashboard/);
    // Chưa khai báo → popup khai báo (bắt buộc).
    await expect(page.getByTestId('declare-modal')).toBeVisible();
  });

  test('mã OTP sai → báo lỗi, không vào app', async ({ page }) => {
    const email = freshEmail('bad');
    await page.goto('/register');
    await page.getByTestId('register-email').fill(email);
    await page.getByTestId('register-send').click();
    const code = await otpOf(email);
    await typeOtp(page, code === '000000' ? '111111' : '000000');
    await page.getByTestId('register-verify').click();
    await expect(page.getByTestId('register-step-2')).toBeVisible();
    await expect(page.getByTestId('register-step-3')).toHaveCount(0);
  });
});
