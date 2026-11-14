// TIP-031 — E2E chế độ http: Đơn hàng trên backend thật — sản phẩm có tồn 10 + khách → tạo đơn 2 cái có cọc (mã DH-, Chờ cọc) →
// xác nhận (trừ kho → tồn 8 ở màn Sản phẩm) → hoàn tất (điểm 10.000đ = 1) → lịch sử; đơn thứ hai huỷ có lý do → hoàn kho; chip Đã huỷ.
import { expect, test } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

test.describe('đơn hàng (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('tạo có cọc → xác nhận trừ kho → hoàn tất cộng điểm; huỷ hoàn kho', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    test.setTimeout(120_000);
    await onboarded(page, 'orders');

    await page.goto('/products');
    await page.getByTestId('pd-add').click();
    const pf = page.getByTestId('pd-form');
    await pf.getByTestId('pd-f-type').selectOption('physical');
    await pf.getByTestId('pd-f-name').fill('Serum phục hồi B5');
    await pf.getByTestId('pd-f-price').fill('600000');
    await pf.getByTestId('pd-f-stock').fill('10');
    await pf.getByTestId('pd-save').click();
    await expect(pf).toHaveCount(0);

    await page.goto('/customers');
    await page.getByTestId('crm-create').click();
    const cf = page.getByTestId('crm-create-modal');
    await cf.getByLabel('Họ và tên *').fill('Chị Lan');
    await cf.getByLabel('Số điện thoại *').fill('0909 777 301');
    await page.getByTestId('crm-save').click();
    await expect(cf).toHaveCount(0);

    const createOrder = async (deposit?: string) => {
      await page.getByTestId('od-create').click();
      const form = page.getByTestId('od-form');
      await form.getByTestId('od-contact').selectOption({ label: 'Chị Lan' });
      await form.getByTestId('od-pick').selectOption({ label: 'Serum phục hồi B5 · 600.000₫' });
      await form.getByTestId('od-pick').selectOption({ label: 'Serum phục hồi B5 · 600.000₫' });
      await expect(form.getByTestId('od-total')).toHaveText(/1\.\d{3}\.\d{3}₫/);
      if (deposit) await form.getByTestId('od-deposit').fill(deposit);
      await form.getByTestId('od-save').click();
      await expect(form).toHaveCount(0);
    };

    await page.goto('/orders');
    await createOrder('300000');
    const drawer = page.getByTestId('od-drawer');
    await expect(drawer).toContainText('DH-001001');
    await expect(drawer.getByTestId('od-status')).toHaveText('Mới');
    await expect(drawer.getByTestId('od-pay')).toHaveText('Chờ cọc');
    await drawer.getByTestId('od-confirm').click();
    await expect(drawer.getByTestId('od-status')).toHaveText('Đang xử lý');
    await drawer.getByTestId('od-complete').click();
    await expect(drawer.getByTestId('od-status')).toHaveText('Hoàn tất');
    const points = (await drawer.getByTestId('od-points').innerText()).match(/\d+/)![0];
    expect(Number(points)).toBeGreaterThan(0);
    await drawer.getByRole('tab', { name: 'Lịch sử' }).click();
    await expect(drawer.getByTestId('od-history')).toContainText('Hoàn tất đơn');
    await expect(drawer.getByTestId('od-history')).toContainText('Xác nhận đơn');
    await drawer.getByRole('button', { name: 'Đóng' }).first().click();

    // Đơn thứ hai: xác nhận (trừ kho) rồi huỷ (hoàn kho).
    await createOrder();
    await expect(drawer).toContainText('DH-001002');
    await drawer.getByTestId('od-confirm').click();
    await expect(drawer.getByTestId('od-status')).toHaveText('Đang xử lý');
    await drawer.getByTestId('od-cancel-open').click();
    await page.getByTestId('od-cancel-reason').fill('Khách đổi lịch');
    await page.getByTestId('od-cancel-ok').click();
    await expect(drawer.getByTestId('od-status')).toHaveText('Đã huỷ');
    await drawer.getByRole('button', { name: 'Đóng' }).first().click();
    await page.getByTestId('od-chips').getByRole('button', { name: /Đã huỷ/ }).click();
    await expect(page.locator('[data-order]')).toHaveCount(1);

    // Kho: 10 − 2 (đơn 1 đã bán) = 8 (đơn 2 trừ rồi hoàn).
    await page.goto('/products');
    await page.locator('[data-product]').filter({ hasText: 'Serum phục hồi B5' }).click();
    await expect(page.getByTestId('pd-drawer').getByTestId('pd-stock-value')).toContainText('8');
  });
});
