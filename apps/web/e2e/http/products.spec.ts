// TIP-027 AC3 — E2E chế độ http: màn Sản phẩm trên backend thật — tạo dịch vụ + sản phẩm vật lý (tồn 10) + combo (thành phần theo
// tên) → danh sách / tìm không dấu / lọc danh mục → sửa giá → điều chỉnh tồn −12 (âm, cảnh báo) → lịch sử có đủ mục → lưu trữ +
// hoàn tác; Dữ liệu RAG có nguồn catalog của sản phẩm (consumer catalog-sync, không giá).
import { expect, test, type Page } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

async function create(
  page: Page,
  name: string,
  type: string,
  price: string,
  fill?: (form: ReturnType<Page['getByTestId']>) => Promise<void>,
) {
  await page.getByTestId('pd-add').click();
  const form = page.getByTestId('pd-form');
  await form.getByTestId('pd-f-type').selectOption(type);
  await form.getByTestId('pd-f-name').fill(name);
  await form.getByTestId('pd-f-price').fill(price);
  await fill?.(form);
  await form.getByTestId('pd-save').click();
  await expect(form).toHaveCount(0);
  await expect(page.locator('[data-product]').filter({ hasText: name })).toBeVisible();
}

test.describe('sản phẩm (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('tạo 3 loại → tìm / lọc → sửa giá → điều chỉnh tồn âm → lịch sử → lưu trữ + hoàn tác → nguồn RAG', async ({
    page,
  }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await onboarded(page, 'catalog');
    await page.goto('/products');
    await expect(page.getByTestId('pd-cats')).toContainText('Liệu trình');

    await create(page, 'Khám da soi VISIA', 'service', '500000', async (f) => {
      await f.getByTestId('pd-f-category').selectOption('Dịch vụ lẻ');
      await f.getByTestId('pd-f-duration').fill('60');
      // TIP-027b: vùng soạn có cấu trúc (contentEditable qua mô hình) — gõ bằng bàn phím, không fill().
      await f.getByTestId('pd-f-desc').click();
      await page.keyboard.type('Soi da chuyên sâu bằng máy VISIA');
    });
    await create(page, 'Serum phục hồi B5', 'physical', '680000', async (f) => {
      await f.getByTestId('pd-f-category').selectOption('Sản phẩm');
      await f.getByTestId('pd-f-stock').fill('10');
    });
    await create(page, 'Combo chăm sóc da', 'combo', '1000000', async (f) => {
      await f.getByTestId('pd-f-category').selectOption('Combo');
      await f.getByTestId('pd-combo-add').click();
      await f.getByTestId('pd-combo-name').fill('kham da soi visia');
      await f.getByTestId('pd-combo-qty').fill('1');
    });
    await expect(page.locator('[data-product]')).toHaveCount(3);
    await expect(page.locator('[data-product]').filter({ hasText: 'Combo chăm sóc da' })).toContainText(
      'Gồm: 1 món',
    );

    // Tìm không dấu + lọc danh mục.
    await page.getByTestId('pd-search').fill('cham soc');
    await expect(page.locator('[data-product]')).toHaveCount(1);
    await page.getByTestId('pd-search').fill('');
    await page.getByTestId('pd-cats').getByRole('button', { name: 'Sản phẩm', exact: true }).click();
    await expect(page.locator('[data-product]')).toHaveCount(1);
    await page.getByTestId('pd-cats').getByRole('button', { name: 'Tất cả' }).click();

    // Sửa giá từ drawer.
    const serum = page.locator('[data-product]').filter({ hasText: 'Serum phục hồi B5' });
    await serum.click();
    const drawer = page.getByTestId('pd-drawer');
    await expect(drawer.getByTestId('pd-stock-value')).toContainText('10');
    await drawer.getByTestId('pd-edit').click();
    const form = page.getByTestId('pd-form');
    await expect(form.getByTestId('pd-f-name')).toHaveValue('Serum phục hồi B5');
    await form.getByTestId('pd-f-price').fill('720000');
    await form.getByTestId('pd-save').click();
    await expect(form).toHaveCount(0);
    await expect(drawer).toContainText('720');

    // Điều chỉnh tồn −12 → −2, cảnh báo.
    await drawer.getByTestId('pd-stock-open').click();
    const m = page.getByTestId('pd-stock');
    await m.getByTestId('pd-stock-delta').fill('-12');
    await m.getByTestId('pd-stock-reason').fill('Kiểm kê cuối tháng');
    await m.getByTestId('pd-stock-save').click();
    await expect(page.getByText('đã chạm ngưỡng cảnh báo')).toBeVisible();
    await expect(drawer.getByTestId('pd-stock-value')).toContainText('-2');

    // Lịch sử: tạo · tồn ban đầu · đổi giá · điều chỉnh.
    await drawer.getByRole('tab', { name: 'Lịch sử' }).click();
    const hist = drawer.getByTestId('pd-history');
    await expect(hist.locator('[data-kind]')).toHaveCount(4);
    await expect(hist.locator('[data-kind="price"]')).toContainText('680.000₫ → 720.000₫');
    await expect(hist.locator('[data-kind="stock"]').first()).toContainText('Kiểm kê cuối tháng');
    await drawer.getByRole('button', { name: 'Đóng' }).first().click();

    // Lưu trữ (menu dòng) + hoàn tác từ thông báo.
    await serum.getByRole('button', { name: 'Thao tác' }).click();
    await page.getByRole('menuitem', { name: 'Xoá' }).click();
    await expect(page.locator('[data-product]')).toHaveCount(2);
    await page.locator('.ant-message-notice').filter({ hasText: 'Xoá sản phẩm' }).first().click();
    await expect(page.locator('[data-product]')).toHaveCount(3);

    // Dữ liệu RAG: nguồn catalog của sản phẩm (consumer catalog-sync — ROLE=jobs).
    await page.goto('/settings/rag_data');
    await expect(page.locator('[data-doc]').filter({ hasText: 'Khám da soi VISIA' })).toBeVisible({
      timeout: 30_000,
    });
  });
});
