// TIP-013 AC10 — E2E chế độ http (pnpm e2e:http): Cài đặt trên backend thật — Tổng quan (sửa website + tải lại), Ngôn ngữ
// (múi giờ), SLA › Giờ làm việc (bật Chủ nhật + tải lại), Vai trò (ma trận 5 vai trò), Thành viên (Owner đầu danh sách; mời khi
// gói dùng thử 1 người dùng → báo hết hạn mức, hộp mời vẫn mở).
import { expect, test } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

test.describe('cài đặt (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('tổng quan, ngôn ngữ, giờ làm việc, vai trò, thành viên — dữ liệu đọc lại từ DB', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    const email = await onboarded(page, 'set');

    await page.goto('/settings/general');
    await expect(page.getByTestId('st-ws-legal_name')).toHaveValue(/MEDIASOFT/);
    await expect(page.getByTestId('st-ws-admin_email')).toHaveValue(email);
    await page.getByTestId('st-ws-website').fill('https://spa-e2e.vn');
    await page.getByTestId('st-ws-save').click();
    await expect(page.getByText('Đã thực hiện:', { exact: false }).first()).toBeVisible();
    await page.reload();
    await expect(page.getByTestId('st-ws-website')).toHaveValue('https://spa-e2e.vn');

    await page.goto('/settings/locale');
    await page.getByTestId('st-tz').selectOption('UTC');
    await page.reload();
    await expect(page.getByTestId('st-tz')).toHaveValue('UTC');

    await page.goto('/settings/org_sla');
    await expect(page.locator('[data-day="6"]')).toContainText('Nghỉ');
    await page.getByTestId('st-sla-day-6').click();
    await expect(page.locator('[data-day="6"]')).toContainText('Mở');
    await page.reload();
    await expect(page.locator('[data-day="6"]')).toContainText('Mở');

    await page.goto('/settings/roles');
    await expect(page.locator('[data-role]')).toHaveCount(5);
    await expect(page.locator('[data-perm="billing.manage"] [data-yes="1"]')).toHaveCount(1);

    await page.goto('/settings/members');
    await expect(page.locator('[data-member]')).toHaveCount(1);
    await expect(page.locator('[data-member]').first()).toContainText(email);
    await page.getByTestId('st-invite').click();
    const m = page.getByTestId('st-member-modal');
    await m.getByTestId('st-mm-email').fill(`moi-${Date.now().toString(36)}@test.appchat.vn`);
    await m.getByTestId('st-member-modal-save').click();
    await expect(page.getByText('Đã chạm giới hạn của gói')).toBeVisible();
    await expect(m).toBeVisible();
  });
});
