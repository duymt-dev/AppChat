// Tiện ích E2E chế độ http (pnpm e2e:http — TIP-011 / 012): thư dev (MAIL_CONSOLE_DIR), OTP, đăng ký + khai báo thật trên backend.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, type Page } from '@playwright/test';

export const MAIL_DIR = process.env.MAIL_CONSOLE_DIR ?? '';

/** Thư gần nhất gửi tới `email` khớp `re` (chờ tới 15 giây). */
export async function mailMatch(email: string, re: RegExp): Promise<string> {
  for (let i = 0; i < 75; i++) {
    try {
      const m = re.exec(readFileSync(join(MAIL_DIR, `${email}.txt`), 'utf8'));
      if (m) return m[1]!;
    } catch {
      /* chưa có thư */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`không thấy thư cho ${email}`);
}
export const otpOf = (email: string) => mailMatch(email, /\b(\d{6})\b/);

export async function typeOtp(page: Page, code: string) {
  const cells = page.getByTestId('otp-input').locator('input');
  for (let i = 0; i < 6; i++) await cells.nth(i).fill(code[i]!);
}

export const freshEmail = (tag: string) => `e2e-${tag}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@test.appchat.vn`;

export async function register(page: Page, email: string) {
  await page.goto('/register');
  await page.getByTestId('register-email').fill(email);
  await page.getByTestId('register-send').click();
  await expect(page.getByTestId('register-step-2')).toBeVisible();
  await typeOtp(page, await otpOf(email));
  await page.getByTestId('register-verify').click();
  await expect(page.getByTestId('register-step-3')).toContainText(email);
  await page.getByTestId('register-enter').click();
}

export async function declare(page: Page) {
  const modal = page.getByTestId('declare-modal');
  await expect(modal).toBeVisible();
  await page.getByTestId('declare-id').fill('0312 345 678');
  await page.getByTestId('declare-lookup').click();
  await expect(page.getByTestId('declare-name')).toHaveValue(/MEDIASOFT/);
  await page.getByTestId('declare-next').click();
  await page.getByTestId('declare-field').fill('Bán lẻ mỹ phẩm');
  await page.getByTestId('declare-submit').click();
}


/** Luật auth 20 lần / giờ / IP (ops §3.2) — mọi test chạy từ localhost; mỗi test một IP giả, không nới luật. */
export async function spoofIp(page: Page) {
  const n = () => Math.floor(Math.random() * 250) + 1;
  await page.setExtraHTTPHeaders({ 'x-forwarded-for': `10.${n()}.${n()}.${n()}` });
}

/** Người dùng mới đã khai báo + qua chào mừng trial → đang ở app. */
export async function onboarded(page: Page, tag: string) {
  const email = freshEmail(tag);
  await register(page, email);
  await declare(page);
  await expect(page.getByTestId('trial-welcome')).toBeVisible({ timeout: 45_000 });
  await page.getByTestId('trial-start').click();
  await expect(page.getByTestId('app-shell')).toBeVisible();
  return email;
}
