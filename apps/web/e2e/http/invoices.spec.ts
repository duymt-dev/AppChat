// TIP-032 — E2E chế độ http: Đề nghị thanh toán trên backend thật — khách → tạo đề nghị (mã TT-, Nháp) → ghi nhận một phần (Thu một
// phần) → đủ (Đã thanh toán, phiếu thu PT-) → yêu cầu hoàn tiền (chờ duyệt) → Chủ sở hữu duyệt ở hàng "Cần đối soát" → "Đã hoàn".
import { expect, test } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

test.describe('đề nghị thanh toán (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('tạo → thu một phần → đủ + phiếu thu → hoàn tiền chờ duyệt → duyệt', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    test.setTimeout(120_000);
    await onboarded(page, 'invoices');

    await page.goto('/customers');
    await page.getByTestId('crm-create').click();
    const cf = page.getByTestId('crm-create-modal');
    await cf.getByLabel('Họ và tên *').fill('Chị Hạnh');
    await cf.getByLabel('Số điện thoại *').fill('0909 777 402');
    await page.getByTestId('crm-save').click();
    await expect(cf).toHaveCount(0);

    await page.goto('/invoices');
    await page.getByTestId('iv-create').click();
    const form = page.getByTestId('iv-form');
    await form.getByTestId('iv-contact').selectOption({ label: 'Chị Hạnh' });
    await form.getByTestId('iv-amount').fill('3000000');
    await form.getByTestId('iv-save').click();
    await expect(form).toHaveCount(0);

    const drawer = page.getByTestId('iv-drawer');
    await expect(drawer).toContainText(/TT-\d{6}/);
    await expect(drawer.getByTestId('iv-status')).toHaveText('Nháp');

    await drawer.getByTestId('iv-record').click();
    await page.getByTestId('iv-record-amount').fill('1000000');
    await page.getByTestId('iv-record-ok').click();
    await expect(drawer.getByTestId('iv-status')).toHaveText('Thu một phần');
    await drawer.getByTestId('iv-record').click();
    await page.getByTestId('iv-record-amount').fill('9000000');
    await page.getByTestId('iv-record-ok').click();
    await expect(page.getByTestId('iv-record-err')).toContainText('không được lớn hơn');
    await page.getByTestId('iv-record-amount').fill('2000000');
    await page.getByTestId('iv-record-ok').click();
    await expect(drawer.getByTestId('iv-status')).toHaveText('Đã thanh toán');
    await expect(drawer.locator('[data-receipt^="PT-"]')).toHaveCount(2);

    await drawer.getByTestId('iv-refund-open').click();
    await page.getByTestId('iv-refund-amount').fill('500000');
    await page.getByTestId('iv-refund-reason').fill('Khách bớt một buổi');
    await page.getByTestId('iv-refund-ok').click();
    await expect(drawer.getByTestId('iv-refund-pending')).toContainText('500.000');
    await drawer.getByRole('button', { name: 'Đóng' }).first().click();

    await page.getByTestId('iv-reconcile-open').click();
    const queue = page.getByTestId('iv-reconcile');
    await expect(queue.getByTestId('iv-refund-queue')).toBeVisible();
    await queue.getByTestId('iv-rf-approve').click();
    await expect(queue.getByTestId('iv-refund-queue')).toHaveCount(0);
    await queue.getByRole('button', { name: 'Đóng' }).first().click();

    await page.locator('[data-invoice]').first().click();
    await expect(drawer.getByTestId('iv-refunded')).toContainText('500.000');
    await drawer.getByRole('tab', { name: 'Lịch sử' }).click();
    await expect(drawer).toContainText('Đã hoàn tiền');
  });
});
