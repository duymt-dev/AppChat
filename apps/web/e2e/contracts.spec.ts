import { expect, test, type Locator, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow, expectTouchTargets, isMobile } from './support/mobile';

const URL = '/contracts?session=authed,declared,trialSeen';

const setRole = async (page: Page, label: string) => {
  await page.getByTestId('dev-toolbar').locator('.ant-select').click();
  await page.locator('.ant-select-item-option', { hasText: label }).click();
};

/** Ký tay một nét trên canvas (pointer events). */
const scribble = async (page: Page, pad: Locator) => {
  await pad.scrollIntoViewIfNeeded();
  const box = (await pad.boundingBox())!;
  await page.mouse.move(box.x + 20, box.y + 40);
  await page.mouse.down();
  await page.mouse.move(box.x + 80, box.y + 90, { steps: 6 });
  await page.mouse.move(box.x + 160, box.y + 50, { steps: 6 });
  await page.mouse.up();
};

test.describe('contracts', () => {
  test('danh sách: KPI, chip 4 trạng thái, tìm, kanban 4 cột, "Ký điện tử" thay "Ký số"', async ({
    page,
  }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await expect(page.locator('[data-contract]')).toHaveCount(5);
    await expect(page.locator('[data-contract="ctr_1180"]')).toContainText('12,8tr');
    await expect(page.locator('[data-contract="ctr_1180"]')).toContainText('16/06/2026 → 16/12/2026');
    await page
      .getByTestId('ct-chips')
      .getByRole('button', { name: /Chờ ký/ })
      .click();
    await expect(page.locator('[data-contract]')).toHaveCount(1);
    await page
      .getByTestId('ct-chips')
      .getByRole('button', { name: /Tất cả/ })
      .click();
    await page.getByTestId('ct-search').fill('bảo an');
    await expect(page.locator('[data-contract]')).toHaveCount(1);
    await page.getByTestId('ct-search').fill('');
    await page.getByTestId('ct-view-kanban').click();
    const board = page.getByTestId('ct-kanban');
    for (const col of ['Đã ký', 'Chờ ký', 'Nháp', 'Hết hạn']) await expect(board).toContainText(col);
    await board.locator('[data-contract="ctr_1180"]').click();
    const drawer = page.getByTestId('ct-drawer');
    await expect(drawer.getByTestId('ct-sign-state')).toHaveText('Ký điện tử 16/06/2026');
    await expect(drawer).not.toContainText('Ký số');
    await drawer.getByRole('tab', { name: 'Lịch sử' }).click();
    await expect(drawer.getByTestId('ct-history')).toContainText('Ký điện tử hoàn tất');
  });

  test('tạo hợp đồng → trình duyệt → Owner duyệt & ký (OTP + chữ ký) → gửi ký → khách ký trên trang công khai', async ({
    page,
  }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.getByTestId('ct-create').click();
    const form = page.getByTestId('ct-form');
    await form.getByTestId('ct-save').click();
    await expect(form.getByTestId('ct-form-err')).toContainText('Khách hàng');
    await form.getByTestId('ct-contact').selectOption('ct_lan');
    await form.getByTestId('ct-value').fill('15.000.000');
    await form.getByTestId('ct-start_date').fill('2026-07-01');
    await form.getByTestId('ct-end_date').fill('2026-06-01');
    await form.getByTestId('ct-save').click();
    await expect(form.getByTestId('ct-form-err')).toContainText('Ngày kết thúc phải sau');
    await form.getByTestId('ct-end_date').fill('2027-01-01');
    await form.getByTestId('ct-save').click();

    const drawer = page.getByTestId('ct-drawer');
    await expect(drawer).toContainText('HĐ-1183');
    await expect(drawer.getByTestId('ct-status')).toHaveText('Nháp');
    await drawer.getByTestId('ct-submit').click();
    await expect(drawer.getByTestId('ct-status')).toHaveText('Chờ duyệt');

    // Duyệt & ký: thiếu chữ ký thì chặn; OTP sai (000000) báo lỗi; đủ thì sang Chờ ký.
    await drawer.getByTestId('ct-approve-sign').click();
    const box = page.getByTestId('ct-approve-box');
    await box.getByTestId('ct-otp').fill('000000');
    await box.getByTestId('ct-approve-ok').click();
    await expect(page.getByText('Vui lòng ký tay trước khi duyệt')).toBeVisible();
    await scribble(page, box.getByTestId('ct-sig'));
    await box.getByTestId('ct-approve-ok').click();
    await expect(page.getByText('Mã OTP không đúng')).toBeVisible();
    await box.getByTestId('ct-otp').fill('123456');
    await box.getByTestId('ct-approve-ok').click();
    await expect(box).toHaveCount(0);
    await expect(drawer.getByTestId('ct-status')).toHaveText('Chờ ký');

    await drawer.getByTestId('ct-send-sign').click();
    await page.getByTestId('ct-send-zalo').click();
    await expect(drawer.getByTestId('ct-sign-link')).toContainText('/sign/');
    await drawer.getByTestId('ct-sign-href').click();

    // Trang ký công khai: đồng ý → OTP → ký tay; sai OTP còn 4 lần; đúng → chứng nhận + SHA-256.
    await expect(page.getByTestId('sign-page')).toContainText('HĐ-1183');
    await expect(page.getByTestId('sign-submit')).toBeDisabled();
    await page.getByTestId('sign-consent').check();
    await page.getByTestId('sign-get-otp').click();
    await expect(page.getByText(/Mã OTP đã gửi qua Zalo/)).toBeVisible();
    await scribble(page, page.getByTestId('sign-pad'));
    await page.getByTestId('sign-otp').fill('111111');
    await page.getByTestId('sign-submit').click();
    await expect(page.getByText(/Còn 4 lần thử/).first()).toBeVisible();
    await page.getByTestId('sign-otp').fill('246810');
    await page.getByTestId('sign-submit').click();
    const cert = page.getByTestId('sign-cert');
    await expect(cert).toContainText('Đã ký hợp đồng thành công');
    await expect(cert.getByTestId('sign-sha')).toHaveText(/^[0-9a-f]{64}$/);
    await expect(cert).toContainText('OTP đúng');

    // Quay lại màn nội bộ: drawer HĐ-1183 vẫn mở (state UI giữ) và đã chuyển Đã ký.
    await page.goBack();
    await expect(page.getByTestId('ct-drawer').getByTestId('ct-status')).toHaveText('Đã ký');
  });

  test('trang ký công khai: từ chối ký; link sai → báo hết hiệu lực', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto('/sign/tk_1181_demo');
    await expect(page.getByTestId('sign-page')).toContainText('Combo chăm sóc da mặt');
    await page.getByTestId('sign-decline').click();
    await page.getByTestId('sign-decline-ok').click();
    await expect(page.getByTestId('sign-declined')).toBeVisible();
    await page.goto('/sign/tk_khong_ton_tai');
    await expect(page.getByTestId('sign-invalid')).toBeVisible();
  });

  test('báo giá đã chốt → Hợp đồng nháp (create_from_quote); HĐ đã ký → Đơn hàng; HĐ hết hạn → Gia hạn', async ({
    page,
  }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto('/quotes?session=authed,declared,trialSeen');
    await page.locator('[data-quote="q_2041"]').click();
    // BG-2041 đã duyệt, chưa gửi → gửi khách trước (QUOTE_FLOW: approved chỉ có quote.send), rồi ghi nhận chốt khi chuyển.
    await page.getByTestId('q-drawer').getByTestId('q-send-zalo').click();
    await expect(page.getByTestId('q-drawer')).toContainText('Đã gửi');
    await page.getByTestId('q-drawer').getByTestId('q-to-contract').click();
    await expect(page).toHaveURL(/\/contracts$/);
    const drawer = page.getByTestId('ct-drawer');
    await expect(drawer).toContainText('HĐ-1183');
    await expect(drawer).toContainText('Chị Lan');
    await expect(drawer.getByTestId('ct-status')).toHaveText('Nháp');
    await drawer.getByRole('button', { name: 'Đóng' }).first().click();
    await page.locator('[data-contract="ctr_1178"]').click();
    await drawer.getByTestId('ct-renew').click();
    await expect(drawer).toContainText('HĐ-1184');
    await drawer.getByRole('button', { name: 'Đóng' }).first().click();
    await page.locator('[data-contract="ctr_1180"]').click();
    await drawer.getByTestId('ct-to-order').click();
    await expect(page).toHaveURL(/\/orders\?from_contract=ctr_1180/);
  });

  test('vai trò Sales: chỉ hợp đồng của mình, không duyệt & ký', async ({ page }) => {
    test.skip(isMobile(page), 'dev toolbar chỉ thao tác trên desktop');
    await page.goto(URL);
    await setRole(page, 'Sales');
    await expect(page.locator('[data-contract]')).toHaveCount(1);
    await expect(page.locator('[data-contract="ctr_1181"]')).toBeVisible();
    await expect(page.getByTestId('ct-bulk-approve')).toHaveCount(0);
    await expect(page.getByTestId('ct-create')).toBeVisible();
    await page.locator('[data-contract="ctr_1181"]').click();
    await expect(page.getByTestId('ct-drawer').getByTestId('ct-send-sign')).toBeDisabled();
  });

  test('390: thẻ hợp đồng, drawer, form, trang ký — không tràn ngang, vùng chạm ≥ 44px', async ({ page }) => {
    test.skip(!isMobile(page), 'chỉ mobile');
    await page.goto(URL);
    await expect(page.getByTestId('ct-table').locator('[data-contract]')).toHaveCount(5);
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(page.getByTestId('ct-create'));
    await page.locator('[data-contract="ctr_1180"]').click();
    await expect(page.getByTestId('ct-drawer')).toBeVisible();
    await expect(page.getByTestId('ct-to-order')).toBeVisible();
    await expectTouchTargets(page.getByTestId('ct-to-order'));
    await expectNoHorizontalOverflow(page);
    await page.getByTestId('ct-drawer').getByRole('button', { name: 'Đóng' }).first().click();
    await page.getByTestId('ct-create').click();
    await expect(page.getByTestId('ct-form')).toBeVisible();
    await expectTouchTargets(page.getByTestId('ct-save'));
    await expectNoHorizontalOverflow(page);
    await page.goto('/sign/tk_1181_demo');
    await expect(page.getByTestId('sign-page')).toBeVisible();
    await expectTouchTargets(page.getByTestId('sign-submit'));
    await expectNoHorizontalOverflow(page);
  });
});
