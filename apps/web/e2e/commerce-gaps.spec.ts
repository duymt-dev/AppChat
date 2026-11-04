// TIP-032b (mock): Cài đặt → Chính sách bán hàng — Owner nâng ngưỡng duyệt thì báo giá 25M hết banner "cần duyệt" (nhãn lý do theo cấu hình);
// Quản lý chỉ xem. Một báo giá → một HĐ HOẶC một đơn: đã sang Đơn hàng thì nút "Tạo hợp đồng" tắt. State mock sống trong trang → chuyển
// màn bằng router phía client (không nạp lại trang giữa các bước).
import { expect, test, type Page } from '@playwright/test';
import { isMobile } from './support/mobile';

const S = '?session=authed,declared,trialSeen';

const nav = (page: Page, path: string) =>
  page.evaluate((p) => (window as unknown as { next: { router: { push: (u: string) => void } } }).next.router.push(p), `${path}${S}`);

const asRole = async (page: Page, role: string) => {
  await page.goto(`/dashboard${S}`);
  await page.evaluate((r) => localStorage.setItem('ac_mock_role', r), role);
};

test.describe('commerce-gaps — chính sách bán hàng (TIP-032b P1)', () => {
  test('Owner nâng ngưỡng tổng → báo giá vượt 20M hết lý do "tổng"; nhãn lý do theo cấu hình', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop (rail); mobile kiểm ô nhập ở test Quản lý');
    await page.goto(`/quotes${S}`);
    await page.locator('[data-quote="q_2039"]').click();
    await expect(page.getByTestId('q-approval-banner')).toContainText('tổng > 20.000.000₫');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('q-drawer')).toHaveCount(0);
    await nav(page, '/settings/sales_policy');
    const box = page.getByTestId('st-sales-policy');
    await expect(box.getByTestId('st-sp-total')).toHaveValue('20000000');
    await expect(box.getByTestId('st-sp-agent')).toContainText('5%');
    await expect(box.getByTestId('st-sp-save')).toBeDisabled();
    await box.getByTestId('st-sp-total').fill('900000000');
    await expect(box).toContainText('900.000.000₫');
    await box.getByTestId('st-sp-pct').fill('101');
    await expect(box.getByTestId('st-sp-save')).toBeDisabled();
    await box.getByTestId('st-sp-pct').fill('5');
    await box.getByTestId('st-sp-save').click();
    await expect(box.getByTestId('st-sp-save')).toBeDisabled();
    await expect(box.getByTestId('st-sp-total')).toHaveValue('900000000');
    await nav(page, '/quotes');
    await page.locator('[data-quote="q_2039"]').click();
    // q_2039 còn giảm 10% (> 5%) → vẫn cần duyệt nhưng chỉ vì giảm giá.
    await expect(page.getByTestId('q-approval-banner')).toContainText('giảm > 5%');
    await expect(page.getByTestId('q-approval-banner')).not.toContainText('tổng >');
  });

  test('Quản lý xem chính sách, không sửa được', async ({ page }) => {
    test.skip(isMobile(page), 'dev toolbar / vai trò chỉ thao tác trên desktop');
    await asRole(page, 'manager');
    await page.goto(`/settings/sales_policy${S}`);
    const box = page.getByTestId('st-sales-policy');
    await expect(box.getByTestId('st-sp-total')).toBeDisabled();
    await expect(box.getByTestId('st-sp-readonly')).toBeVisible();
    await expect(box.getByTestId('st-sp-save')).toHaveCount(0);
    await page.evaluate(() => localStorage.removeItem('ac_mock_role'));
  });

  test('báo giá đã sang Đơn hàng → nút Tạo hợp đồng tắt (một báo giá → một HĐ hoặc một đơn)', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(`/quotes${S}`);
    await page.locator('[data-quote="q_2041"]').click();
    const drawer = page.getByTestId('q-drawer');
    await drawer.getByTestId('q-send-zalo').click();
    await expect(drawer).toContainText('Đã gửi');
    await drawer.getByTestId('q-to-order').click();
    await expect(page).toHaveURL(/\/orders/);
    await expect(page.getByTestId('od-drawer')).toContainText('BG-2041');
    await page.getByTestId('od-drawer').getByRole('button', { name: 'Đóng' }).first().click();
    await expect(page.getByTestId('od-drawer')).toHaveCount(0);
    await nav(page, '/quotes');
    await page.locator('[data-quote="q_2041"]').click();
    await expect(page.getByTestId('q-drawer').getByTestId('q-to-contract')).toBeDisabled();
    await expect(page.getByTestId('q-drawer').getByTestId('q-to-order')).toBeEnabled();
  });
});
