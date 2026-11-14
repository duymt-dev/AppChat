// TIP-032b (mock): Cài đặt → Chính sách bán hàng — Owner nâng ngưỡng duyệt thì báo giá 25M hết banner "cần duyệt" (nhãn lý do theo cấu hình);
// Quản lý chỉ xem. Một báo giá → một HĐ HOẶC một đơn: đã sang Đơn hàng thì nút "Tạo hợp đồng" tắt. State mock sống trong trang → chuyển
// màn bằng router phía client (không nạp lại trang giữa các bước).
import { expect, test, type Page } from '@playwright/test';
import { isMobile } from './support/mobile';
import { confirmPreview } from './support/confirm';

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
    await confirmPreview(page);
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

test.describe('commerce-gaps — gửi chứng từ (TIP-032b P2)', () => {
  test('báo giá: Gửi khác → chọn Website chat + Ảnh từng trang → gửi; đơn: Gửi xác nhận đơn; đề nghị: kênh Web chat + gửi phiếu thu', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(`/quotes${S}`);
    await page.locator('[data-quote="q_2041"]').click();
    await page.getByTestId('q-drawer').getByTestId('q-send-more').click();
    const dlg = page.getByTestId('q-delivery');
    await expect(dlg.getByTestId('q-delivery-webchat')).toHaveAttribute('aria-checked', 'true');
    await dlg.getByTestId('q-delivery-image').click();
    await expect(dlg).toContainText('đủ trang');
    await dlg.getByTestId('q-delivery-send').click();
    await confirmPreview(page);
    await expect(dlg).toHaveCount(0);
    await expect(page.getByTestId('q-drawer')).toContainText('Đã gửi');
    await page.keyboard.press('Escape');
    await nav(page, '/orders');
    await page.locator('[data-order="ord_290411"]').click();
    const od = page.getByTestId('od-drawer');
    await od.getByTestId('od-send-channel').selectOption('email');
    await od.getByTestId('od-send-confirmation').click();
    await expect(page.getByText('Gửi xác nhận đơn cho khách')).toBeVisible();
    await page.keyboard.press('Escape');
    await nav(page, '/invoices');
    await page.locator('[data-invoice="inv_2039"]').click();
    const iv = page.getByTestId('iv-drawer');
    await iv.getByTestId('iv-send-channel').selectOption('webchat');
    await expect(iv.getByTestId('iv-send-channel')).toHaveValue('webchat');
    await iv.getByTestId('iv-receipt-send').first().click();
    await expect(page.getByText('Gửi phiếu thu cho khách')).toBeVisible();
  });
});

test.describe('commerce-gaps — trang chứng từ công khai (TIP-032b P2)', () => {
  test('khách mở link → thấy loại + mã chứng từ, nút Tải PDF (vùng chạm ≥ 44px); link hỏng → thẻ không còn hiệu lực', async ({ page }) => {
    await page.goto('/documents/payment_request~DNTT-2039');
    await expect(page.getByTestId('pd-title')).toHaveText('Đề nghị thanh toán DNTT-2039');
    const btn = page.getByTestId('pd-pdf');
    await expect(btn).toBeVisible();
    expect((await btn.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.goto('/documents/khong-hop-le');
    await expect(page.getByTestId('pd-invalid')).toBeVisible();
  });
});

test.describe('commerce-gaps — liệu trình khi cọc (TIP-032b P3)', () => {
  test('thêm sản phẩm loại liệu trình: bật "Cho dùng khi khách mới cọc" → lưu → mở lại sửa thấy đã bật', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(`/products${S}`);
    await page.getByTestId('pd-add').click();
    const form = page.getByTestId('pd-form');
    await form.getByTestId('pd-f-name').fill('Liệu trình cọc dùng ngay E2E');
    await form.getByTestId('pd-f-type').selectOption('package');
    await form.getByTestId('pd-f-price').fill('6000000');
    const flag = form.getByTestId('pf-grant-on-deposit');
    await expect(flag).not.toBeChecked();
    await flag.check();
    await form.getByTestId('pd-save').click();
    await expect(form).toBeHidden();
    await page.getByTestId('pd-search').fill('cọc dùng ngay E2E');
    await page.getByText('Liệu trình cọc dùng ngay E2E').first().click();
    await page.getByTestId('pd-drawer').getByTestId('pd-edit').click();
    await expect(page.getByTestId('pd-form').getByTestId('pf-grant-on-deposit')).toBeChecked();
  });
});

test.describe('commerce-gaps — nhập sản phẩm từ tệp (TIP-032b P4)', () => {
  const csv = (rows: string[]) => ({ name: 'sp.csv', mimeType: 'text/csv', buffer: Buffer.from(['Tên,Giá,Mã', ...rows].join('\n'), 'utf8') });

  test('≤ 500 dòng: xem trước → xác nhận → tạo 2, cập nhật 1 (SKU có sẵn), 1 dòng lỗi; sản phẩm mới hiện trong danh sách', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(`/products${S}`);
    await page.getByTestId('pd-import-open').click();
    const m = page.getByTestId('pd-import');
    await m.getByTestId('pd-import-file').setInputFiles(csv(['Serum nhập E2E,350.000,NK-1', 'Kem nhập E2E,420000,NK-2', 'HIFU đổi tên E2E,13000000,SP-1001', ',100000,NK-3']));
    await expect(m).toContainText('sp.csv');
    await m.getByTestId('pd-import-run').click();
    await page.getByRole('button', { name: 'Xác nhận' }).click();
    await expect(m.getByTestId('pd-import-status')).toContainText('Đã xong');
    await expect(m.getByTestId('pd-import-status')).toContainText('tạo 2 · cập nhật 1 · lỗi 1');
    await page.getByRole('button', { name: 'Đóng' }).first().click();
    await page.getByTestId('pd-search').fill('nhập E2E');
    await expect(page.getByText('Serum nhập E2E').first()).toBeVisible();
    await page.getByTestId('pd-search').fill('HIFU đổi tên E2E');
    await expect(page.getByText('HIFU đổi tên E2E').first()).toBeVisible();
  });

  test('> 500 dòng: 202 job_accepted → báo "đang chạy nền", theo dõi tới khi xong (không gọi lại action)', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(`/products${S}`);
    await page.getByTestId('pd-import-open').click();
    const m = page.getByTestId('pd-import');
    await m.getByTestId('pd-import-file').setInputFiles(csv(Array.from({ length: 501 }, (_, i) => `Hàng loạt ${i + 1},10000,HL-${i + 1}`)));
    await expect(m).toContainText('sp.csv');
    await m.getByTestId('pd-import-run').click();
    await page.getByRole('button', { name: 'Xác nhận' }).click();
    await expect(page.getByText('đang chạy nền').first()).toBeVisible();
    await expect(m.getByTestId('pd-import-status')).toContainText('Đã xong', { timeout: 15_000 });
    await expect(m.getByTestId('pd-import-status')).toContainText('Đã xử lý 501/501 · tạo 501');
  });
});
