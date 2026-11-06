import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, expectTouchTargets, isMobile } from './support/mobile';

const S = '?session=authed,declared,trialSeen';
const go = (section: string, q = '') => `/settings/${section}${S}${q}`;

test.describe('settings · Gói & ví', () => {
  test('Gói & thanh toán: thẻ gói hiện tại, lọc hoá đơn, thanh toán hoá đơn chờ qua QR', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(go('billing'));
    await expect(page.getByTestId('st-bill-plan')).toHaveText('Ultimate');
    await expect(page.getByText('Demo: hết hạn')).toHaveCount(0);
    await expect(page.locator('[data-invoice]')).toHaveCount(7);
    await page.getByTestId('st-bill-status').selectOption('paid');
    await expect(page.locator('[data-invoice]')).toHaveCount(5);
    await page.getByTestId('st-bill-status').selectOption('all');
    await page.getByTestId('st-bill-search').fill('credit');
    await expect(page.locator('[data-invoice]')).toHaveCount(3);
    await page.getByTestId('st-bill-search').fill('');
    await page.getByTestId('st-bill-from').fill('01/01/2026');
    await expect(page.locator('[data-invoice]')).toHaveCount(4);
    await page.getByTestId('st-bill-from').fill('');
    await page.getByTestId('st-bill-pay-INV-2026-0712').click();
    const co = page.getByTestId('checkout-modal');
    await expect(co.getByTestId('checkout-amount')).toHaveText(/2\.000\.000/);
    await co.getByTestId('checkout-paid').click();
    await expect(co.getByTestId('checkout-done')).toBeVisible();
    await co.getByRole('button', { name: 'Hoàn tất' }).click();
    await expect(page.locator('[data-invoice="INV-2026-0712"]')).toHaveAttribute('data-status', 'paid');
  });

  test('Nâng cấp: ?upgrade=1 mở popup, băng dùng thử, đổi phân khúc, chọn gói → QR → kích hoạt', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(go('billing', '&upgrade=1'));
    const m = page.getByTestId('upgrade-modal');
    await expect(m.getByTestId('upgrade-trial')).toContainText('15');
    await expect(m.getByTestId('plan-cta-personal_pro')).toBeDisabled();
    await expect(m.locator('[data-cmp-group]')).toHaveCount(10);
    await m.getByRole('button', { name: 'Thu gọn tất cả' }).click();
    await expect(m.getByText('Người dùng', { exact: true })).toHaveCount(0);
    await m.getByTestId('seg-business').first().click();
    await expect(m.locator('[data-plan]')).toHaveCount(4);
    await expect(m.locator('[data-plan="team"]')).toBeVisible();
    await m.getByTestId('plan-cta-business').click();
    // TIP-039: xác nhận giá server tính trước khi tạo hoá đơn.
    const pc = page.getByTestId('plan-change-modal');
    await expect(pc.getByTestId('plan-change-amount')).toContainText('12.900.000');
    await pc.getByTestId('plan-change-modal-save').click();
    await expect(m).toBeHidden();
    const co = page.getByTestId('checkout-modal');
    await expect(co.getByTestId('checkout-amount')).toHaveText(/12\.900\.000/);
    await expect(co.getByTestId('checkout-content')).toContainText('APPCHAT');
    await co.getByTestId('checkout-paid').click();
    await co.getByRole('button', { name: 'Hoàn tất' }).click();
    await expect(page.getByTestId('st-bill-plan')).toHaveText('Business');
  });

  test('Ví: số dư credit, nhắc credit (không tự nạp), nạp credit qua QR, lịch sử ví, hoá đơn', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(go('wallet'));
    await expect(page.getByTestId('st-wal-balance')).toContainText('103.600');
    await expect(page.getByText(/Tự động nạp|tự chuyển mô hình/)).toHaveCount(0);
    await page.getByTestId('st-wal-alert').click();
    await expect(page.getByTestId('st-wal-alert')).toHaveAttribute('aria-checked', 'false');
    await page.getByTestId('st-wal-topup').click();
    await page.getByTestId('credit-pack-credit_1000').click();
    const co = page.getByTestId('checkout-modal');
    await expect(co.getByTestId('checkout-amount')).toHaveText(/1\.000\.000/);
    await co.getByTestId('checkout-paid').click();
    await co.getByRole('button', { name: 'Hoàn tất' }).click();
    await expect(page.getByTestId('st-wal-balance')).toContainText('104.650');
    await page.getByTestId('wal-shop-addon').click();
    await expect(page.locator('[data-addon]')).toHaveCount(2);
    await page.getByTestId('st-wal-tab-history').click();
    await expect(page.locator('[data-ledger]')).toHaveCount(7);
    await page.getByTestId('st-wal-ledger-filter').selectOption('out');
    await expect(page.locator('[data-ledger="usage"]')).toHaveCount(3);
    await expect(page.locator('[data-ledger="topup"]')).toHaveCount(0);
    await page.getByTestId('st-wal-tab-invoice').click();
    await expect(page.locator('[data-invoice]')).toHaveCount(8);
  });

  test('quyền: chỉ Chủ sở hữu vào Gói & ví (billing.manage)', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(go('wallet'));
    await page.evaluate(() => localStorage.setItem('ac_mock_role', 'manager'));
    await page.reload();
    await expect(page.getByText('Bạn không có quyền xem mục này')).toBeVisible();
    await page.evaluate(() => localStorage.removeItem('ac_mock_role'));
  });

  test('390: Gói & thanh toán, Ví, popup Nâng cấp, nạp credit, QR — không tràn ngang, vùng chạm ≥ 44px', async ({ page }) => {
    test.skip(!isMobile(page), 'chỉ mobile');
    await page.goto(go('billing'));
    await expect(page.getByTestId('st-bill-hero')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(page.getByTestId('st-bill-renew'));
    await page.getByTestId('st-bill-renew').click();
    await expect(page.getByTestId('upgrade-modal')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.goto(go('wallet'));
    await expect(page.getByTestId('st-wal-hero')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(page.getByTestId('st-wal-topup'));
    await page.getByTestId('st-wal-topup').click();
    await expect(page.getByTestId('credit-modal')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByTestId('credit-pack-credit_500').click();
    await expect(page.getByTestId('checkout-modal')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
