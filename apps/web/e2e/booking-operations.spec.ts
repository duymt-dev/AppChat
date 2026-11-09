import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, expectTouchTargets, isMobile } from './support/mobile';

// TIP-033b — Cài đặt Lịch hẹn (mock): giờ mở cửa 7 thứ (nghỉ / giờ sai báo tại chỗ, lưu tăng version), nhân sự ca riêng ba trạng thái
// (theo giờ mở cửa / nghỉ / giờ riêng) lưu rồi đọc lại đúng; 390 không tràn ngang.
const URL = '/settings/booking?session=authed,declared,trialSeen';

test.describe('booking-operations · Cài đặt Lịch hẹn', () => {
  test('giờ mở cửa: nghỉ Chủ nhật, giờ ngược báo lỗi + chặn Lưu, sửa lại → Lưu; Hoàn lại bỏ nháp', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await expect(page.getByTestId('st-bk-hours')).toBeVisible();
    await page.getByTestId('st-bk-open-6').uncheck();
    await expect(page.getByTestId('st-bk-day-6')).toContainText('Không nhận lịch');
    await page.getByTestId('st-bk-start-0').fill('20:00');
    await expect(page.getByTestId('st-bk-day-0')).toContainText('Giờ bắt đầu phải trước giờ kết thúc');
    await expect(page.getByTestId('st-bk-save')).toBeDisabled();
    await page.getByTestId('st-bk-start-0').fill('09:00');
    await page.getByTestId('st-bk-save').click();
    // Lưu xong: query đọc lại bản mới (version +1) → nháp bỏ, form hiện giá trị đã lưu, Lưu tắt.
    await expect(page.getByTestId('st-bk-save')).toBeDisabled();
    await expect(page.getByTestId('st-bk-open-6')).not.toBeChecked();
    await expect(page.getByTestId('st-bk-start-0')).toHaveValue('09:00');
    await page.getByTestId('st-bk-buffer').fill('25');
    await page.getByTestId('st-bk-reset').click();
    await expect(page.getByTestId('st-bk-buffer')).toHaveValue('10');
  });

  test('nhân sự: ca riêng ba trạng thái lưu rồi đọc lại; thêm nhân sự mới', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    const row = page.locator('[data-testid^="st-bk-row-"]').first();
    await expect(row).toContainText('Theo giờ mở cửa');
    await row.click();
    const d = page.getByTestId('st-bk-staff-drawer');
    await d.getByTestId('st-bk-mode-1').selectOption('closed');
    await d.getByTestId('st-bk-mode-2').selectOption('custom');
    await d.getByTestId('st-bk-sstart-2').fill('13:00');
    await d.getByTestId('st-bk-send-2').fill('17:00');
    await d.getByTestId('st-bk-staff-save').click();
    await expect(d).toBeHidden();
    await expect(row).toContainText('Nghỉ 1 ngày · giờ riêng 1 ngày');
    await row.click();
    await expect(d.getByTestId('st-bk-mode-1')).toHaveValue('closed');
    await expect(d.getByTestId('st-bk-mode-0')).toHaveValue('inherit');
    await expect(d.getByTestId('st-bk-sstart-2')).toHaveValue('13:00');
    await page.keyboard.press('Escape');
    await page.getByTestId('st-bk-add').click();
    await d.getByTestId('st-bk-name').fill('KTV. Mới');
    await d.getByTestId('st-bk-staff-save').click();
    await expect(page.getByTestId('st-bk-staff')).toContainText('KTV. Mới');
  });

  test('390: không tràn ngang, vùng chạm ≥ 44px', async ({ page }) => {
    test.skip(!isMobile(page), 'chỉ mobile');
    await page.goto(URL);
    await expect(page.getByTestId('st-booking')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(page.getByTestId('st-bk-hours').locator('select, button'));
  });
});

// TIP-033b P4 — thẻ Liệu trình dùng chung ở Hồ sơ 360° (Khách hàng): đã dùng / tổng / còn lại của server, trạng thái, không số tiền.
test.describe('booking-operations · Liệu trình ở Hồ sơ 360°', () => {
  test('mở 360° chị Lan → tab Tổng quan có thẻ Liệu trình 3/10 · còn 7', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto('/customers?session=authed,declared,trialSeen');
    await page.locator('[data-contact="ct_lan"]').click();
    const card = page.getByTestId('crm-360').getByTestId('pk-card');
    await expect(card).toContainText('Liệu trình chăm sóc da 10 buổi');
    await expect(card).toContainText('Đã dùng 3/10 buổi · còn 7');
    await expect(card).toContainText('Đang dùng');
    await expect(card).not.toContainText('₫');
    // P5 (§5.1): xuất CSV liệu trình của khách — tệp thật tải về đúng tên / số buổi / còn lại.
    const dl = page.waitForEvent('download');
    await card.getByTestId('pk-export-csv').click();
    const d = await dl;
    expect(d.suggestedFilename()).toMatch(/^lieu-trinh-.*\.csv$/);
    const file = await d.createReadStream();
    const text = await new Promise<string>((ok) => {
      let b = '';
      file.on('data', (c) => (b += c));
      file.on('end', () => ok(b));
    });
    expect(text).toContain('Liệu trình chăm sóc da 10 buổi,10,3,7,active');
  });
});
