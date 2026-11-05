// TIP-032b — E2E chế độ http trên backend thật: Cài đặt → Chính sách bán hàng (Owner đổi ngưỡng, lưu qua sales_settings.update) ·
// Sản phẩm: liệu trình bật "Cho dùng khi khách mới cọc" lưu và mở lại vẫn bật · Nhập từ tệp CSV: xem trước → xác nhận → tạo 2 + cập nhật 1
// theo SKU + 1 dòng lỗi (lần nhập ≤ 500 dòng chạy ngay sau commit, trạng thái đọc ở /v1/product-imports/:id).
import { expect, test } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

test.describe('commerce-gaps (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('liệu trình khi cọc lưu thật; nhập sản phẩm từ CSV: tạo / cập nhật theo SKU / dòng lỗi', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await onboarded(page, 'gaps');
    await page.goto('/products');

    await page.getByTestId('pd-add').click();
    const form = page.getByTestId('pd-form');
    await form.getByTestId('pd-f-type').selectOption('package');
    await form.getByTestId('pd-f-name').fill('Liệu trình cọc dùng ngay');
    await form.getByTestId('pd-f-price').fill('6000000');
    await form.getByTestId('pf-grant-on-deposit').check();
    await form.getByTestId('pd-save').click();
    await expect(form).toHaveCount(0);
    const row = page.locator('[data-product]').filter({ hasText: 'Liệu trình cọc dùng ngay' });
    const code = (await row.locator('td').filter({ hasText: /^[A-Z]{2,}-\d+$/ }).first().innerText()).trim();
    expect(code).toMatch(/^[A-Z]{2,}-\d+$/);
    await row.click();
    await page.getByTestId('pd-drawer').getByTestId('pd-edit').click();
    await expect(page.getByTestId('pd-form').getByTestId('pf-grant-on-deposit')).toBeChecked();
    await page.getByTestId('pd-form').getByRole('button', { name: 'Huỷ' }).click();
    await page.goto('/products');

    await page.getByTestId('pd-import-open').click();
    const m = page.getByTestId('pd-import');
    const csv = ['Tên,Giá,Mã', 'Serum nhập HTTP,350.000,NK-1', 'Kem nhập HTTP,420000,NK-2', `Liệu trình đổi tên,6500000,${code}`, ',100000,NK-3'];
    await m.getByTestId('pd-import-file').setInputFiles({ name: 'sp.csv', mimeType: 'text/csv', buffer: Buffer.from(csv.join('\n'), 'utf8') });
    await expect(m).toContainText('sp.csv');
    await m.getByTestId('pd-import-run').click();
    await page.getByRole('button', { name: 'Xác nhận' }).click();
    await expect(m.getByTestId('pd-import-status')).toContainText('Đã xong', { timeout: 30_000 });
    await expect(m.getByTestId('pd-import-status')).toContainText('tạo 2 · cập nhật 1 · lỗi 1');
    await m.getByRole('button', { name: 'Đóng' }).first().click();
    await page.getByTestId('pd-search').fill('nhập HTTP');
    await expect(page.locator('[data-product]').filter({ hasText: 'Serum nhập HTTP' })).toBeVisible();
    await page.getByTestId('pd-search').fill('Liệu trình đổi tên');
    await expect(page.locator('[data-product]').filter({ hasText: 'Liệu trình đổi tên' })).toBeVisible();
  });
});
