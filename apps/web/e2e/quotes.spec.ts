import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow, expectTouchTargets, isMobile } from './support/mobile';
import { confirmPreview } from './support/confirm';

const URL = '/quotes?session=authed,declared,trialSeen';

const setRole = async (page: Page, label: string) => {
  await page.getByTestId('dev-toolbar').locator('.ant-select').click();
  await page.locator('.ant-select-item-option', { hasText: label }).click();
};

test.describe('quotes', () => {
  test('danh sách: chip trạng thái, tìm, kanban, hiệu lực 15 ngày, tổng tính thuế sau chiết khấu', async ({
    page,
  }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await expect(page.locator('[data-quote]')).toHaveCount(3);
    // BG-2041: 12.800.000 − 5% = 12.160.000 + VAT 8% = 13.132.800 (không trừ điểm trên báo giá — COMMERCE §3)
    await expect(page.locator('[data-quote="q_2041"]')).toContainText('13,1tr₫');
    await expect(page.locator('[data-quote="q_2041"]')).toContainText('09/07/2026');
    await page
      .getByTestId('q-chips')
      .getByRole('button', { name: /Đã gửi/ })
      .click();
    await expect(page.locator('[data-quote]')).toHaveCount(1);
    await page
      .getByTestId('q-chips')
      .getByRole('button', { name: /Tất cả/ })
      .click();
    await page.getByTestId('q-search').fill('dũng');
    await expect(page.locator('[data-quote]')).toHaveCount(1);
    await page.getByTestId('q-search').fill('');
    await page.getByTestId('q-view-kanban').click();
    await expect(page.getByTestId('q-kanban')).toBeVisible();
  });

  test('vượt ngưỡng: gửi bị chặn → gửi duyệt → duyệt → gửi Zalo → khách chốt → sang Đơn hàng', async ({
    page,
  }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.locator('[data-quote="q_2039"]').click();
    const drawer = page.getByTestId('q-drawer');
    await expect(drawer.getByTestId('q-approval-banner')).toContainText('tổng > 20.000.000₫');
    await drawer.getByTestId('q-send-zalo').click();
    await expect(page.getByText('Báo giá vượt ngưỡng — cần duyệt trước khi gửi')).toBeVisible();
    await drawer.getByTestId('q-submit').click();
    await expect(drawer).toContainText('Chờ duyệt');
    await drawer.getByTestId('q-approve').click();
    await expect(drawer).toContainText('Đã duyệt');
    await drawer.getByTestId('q-send-zalo').click();
    await confirmPreview(page);
    await expect(drawer).toContainText('Đã gửi');
    // TIP-028b: PDF tạo ở job — API trả ngay, dải "Đang tạo PDF" rồi tự mất khi job xong (WS document.render).
    await expect(drawer.getByTestId('q-render')).toHaveAttribute('data-render', 'pending_render');
    await expect(drawer.getByTestId('q-render')).toContainText('Đang tạo PDF');
    await expect(drawer.getByTestId('q-render')).toHaveCount(0);
    await drawer.getByTestId('q-to-order').click();
    // OrdersScreen tạo đơn từ `?from_quote=` rồi thay URL về /orders (như orders.spec) — kiểm đơn mở đúng báo giá.
    await expect(page).toHaveURL(/\/orders$/);
    await expect(page.getByTestId('od-drawer')).toContainText('BG-2039');
  });

  test('tạo báo giá: chọn khách + sản phẩm catalog, chiết khấu tổng, ngoài danh mục buộc duyệt; trao đổi nội bộ; bản sửa n+1', async ({
    page,
  }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.getByTestId('q-create').click();
    const form = page.getByTestId('q-form');
    await form.getByTestId('q-save').click();
    await expect(form).toContainText('Chọn khách hàng');
    await form.getByTestId('q-contact').selectOption('ct_lan');
    await form.getByTestId('q-pick').selectOption('pd_4');
    await expect(form.getByTestId('q-total')).toHaveValue('540.000₫');
    await form.getByTestId('q-header-disc').fill('10');
    await expect(form.getByTestId('q-needs-approval')).toContainText('giảm > 5%');
    await form.getByTestId('q-header-disc').fill('0');
    await expect(form.getByTestId('q-needs-approval')).toHaveCount(0);
    await form.getByTestId('q-save').click();
    const drawer = page.getByTestId('q-drawer');
    await expect(drawer).toContainText('BG-2042');
    await expect(page.locator('[data-quote]')).toHaveCount(4);
    await drawer.getByTestId('q-comment-input').fill('Khách hỏi lịch tuần sau');
    await drawer.getByTestId('q-comment-input').press('Enter');
    await expect(drawer.getByTestId('q-comments')).toContainText('Khách hỏi lịch tuần sau');
    // TIP-028b: mock — ghi chú "[render-fail]" làm job render lỗi hết lượt → dải lỗi + Thử lại → tạo lại được.
    await drawer.getByPlaceholder('Ghi chú').fill('[render-fail]');
    await drawer.getByPlaceholder('Ghi chú').blur();
    await drawer.getByTestId('q-send-zalo').click();
    await confirmPreview(page);
    await expect(drawer.getByTestId('q-render')).toHaveAttribute('data-render', 'render_failed');
    await expect(drawer.getByTestId('q-render')).toContainText('Tạo PDF chưa được');
    await drawer.getByTestId('q-render-retry').click();
    await expect(drawer.getByTestId('q-render')).toHaveCount(0);
    await drawer.getByTestId('q-revision').click();
    await expect(drawer).toContainText('Lần 2');
    await drawer.getByRole('tab', { name: 'Lịch sử' }).click();
    await expect(drawer.getByTestId('q-version')).toHaveCount(2);
  });

  test('AI soạn báo giá từ nội dung: khớp catalog, giá từ catalog, chỉ tạo nháp (D30)', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.getByTestId('q-ai-open').click();
    // TIP-023c G2: nút nghiệp vụ gửi lượt Trợ lý thật → cây GenUI gọn trong drawer (không còn câu trả lời mẫu).
    await page.getByTestId('q-ai-sugg').click();
    await expect(page.getByTestId('q-ai').getByTestId('genui')).toContainText('HIFU 8 buổi');
    await page.getByTestId('q-ai-draft').click();
    const modal = page.getByTestId('q-draft');
    await modal.getByTestId('q-draft-contact').selectOption('ct_lan');
    await modal
      .getByTestId('q-draft-content')
      .fill('Chị Lan lấy Khám da soi VISIA + Serum phục hồi B5, giảm 5%');
    await modal.getByTestId('q-draft-run').click();
    const drawer = page.getByTestId('q-drawer');
    await expect(drawer).toContainText('Nháp');
    await expect(drawer.getByTestId('q-detail-lines').getByLabel('Hạng mục').first()).toHaveValue(
      'Khám da soi VISIA',
    );
    await expect(drawer.getByTestId('q-detail-lines').getByLabel('Hạng mục').nth(1)).toHaveValue(
      'Serum phục hồi B5',
    );
    // (500.000 + 680.000) − 5% = 1.121.000 + 8% = 1.210.680
    await expect(drawer.getByTestId('q-detail-total')).toHaveText('1.210.680₫');
  });

  test('vai trò Sales: chỉ báo giá của mình, không có quyền duyệt', async ({ page }) => {
    test.skip(isMobile(page), 'dev toolbar chỉ thao tác trên desktop');
    await page.goto(URL);
    await setRole(page, 'Sales');
    // scope sales = own: người dùng mock (Trâm) chỉ thấy BG-2040 của mình
    await expect(page.locator('[data-quote]')).toHaveCount(1);
    await expect(page.locator('[data-quote="q_2040"]')).toBeVisible();
    await expect(page.getByTestId('q-bulk-approve')).toHaveCount(0);
    await expect(page.getByTestId('q-create')).toBeVisible();
  });

  test('Tải PDF + trang xem công khai (báo giá đã gửi); link sai báo hết hiệu lực', async ({ page, context }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.locator('[data-quote="q_2041"]').click();
    const popup = context.waitForEvent('page');
    await page.getByTestId('q-drawer').getByTestId('q-pdf').click();
    await (await popup).close();
    // Mock: token công khai = id báo giá (server: token ký HMAC trong tin gửi khách); mock DB nạp lại theo trang → dùng BG-2040 đã gửi.
    // Luồng gửi → mở link → "Khách đã xem" chạy ở E2E http (quotes.spec.ts).
    await page.goto('/q/q_2040?session=authed,declared,trialSeen');
    await expect(page.getByTestId('pq-title')).toContainText('BG-2040');
    await expect(page.getByTestId('pq-total')).toBeVisible();
    await expect(page.getByTestId('pq-pdf')).toBeVisible();
    await page.goto('/q/khong-ton-tai?session=authed,declared,trialSeen');
    await expect(page.getByTestId('pq-invalid')).toBeVisible();
  });

  test('390: thẻ báo giá, drawer, form toàn màn, không tràn ngang, vùng chạm ≥ 44px', async ({ page }) => {
    test.skip(!isMobile(page), 'chỉ mobile');
    await page.goto(URL);
    await expect(page.getByTestId('q-table').locator('[data-quote]')).toHaveCount(3);
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(page.getByTestId('q-create'));
    await page.locator('[data-quote="q_2041"]').click();
    await expect(page.getByTestId('q-drawer')).toBeVisible();
    await expectTouchTargets(page.getByTestId('q-to-order'));
    await expectNoHorizontalOverflow(page);
    await page.getByTestId('q-drawer').getByRole('button', { name: 'Đóng' }).first().click();
    await page.getByTestId('q-create').click();
    await expect(page.getByTestId('q-form')).toBeVisible();
    await expectTouchTargets(page.getByTestId('q-save'));
    await expectNoHorizontalOverflow(page);
  });
});
