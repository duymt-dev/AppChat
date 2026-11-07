// TIP-034 — E2E chế độ http: Ticket trên backend thật — tạo (TKT-, hạn SLA theo chính sách mặc định 4 giờ làm việc) → ghi chú nội bộ +
// trả lời khách → lịch sử → đóng (lý do bắt buộc) → mở lại; KPI đếm đúng; Cài đặt › SLA đọc chính sách mặc định thật.
import { expect, test } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

test.describe('ticket (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('tạo → ghi chú / trả lời → đóng → mở lại; KPI; Cài đặt SLA', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    test.setTimeout(120_000);
    await onboarded(page, 'tickets');

    await page.goto('/tickets');
    await expect(page.getByTestId('tk-kpi-total-v')).toHaveText('0');
    await page.getByTestId('tk-create').click();
    const f = page.getByTestId('tk-form');
    await f.getByTestId('tk-title').fill('Khách báo lỗi thanh toán');
    await f.getByTestId('tk-company').fill('Cty Hoà Bình');
    await f.getByTestId('tk-channel').selectOption('email');
    await f.getByTestId('tk-category').selectOption('Billing');
    await f.getByTestId('tk-priority').selectOption('medium');
    await f.getByTestId('tk-desc').fill('Chuyển khoản không nhận được');
    await f.getByTestId('tk-save').click();
    await expect(f).toHaveCount(0);

    const d = page.getByTestId('tk-drawer');
    await expect(d).toContainText(/TKT-\d{4}/);
    await expect(d.getByTestId('tk-status')).toHaveText('Đang mở');
    await d.getByTestId('tk-comment').fill('Đã kiểm tra sao kê');
    await d.getByTestId('tk-send').click();
    await d.getByTestId('tk-mode-reply').click();
    await d.getByTestId('tk-comment').fill('Dạ em đang kiểm tra giúp anh/chị ạ');
    await d.getByTestId('tk-send').click();
    await d.getByRole('tab', { name: 'Lịch sử' }).click();
    await expect(d.getByTestId('tk-history')).toContainText('Thêm ghi chú nội bộ');
    await expect(d.getByTestId('tk-history')).toContainText('Trả lời khách');
    await d.getByRole('tab', { name: 'Chi tiết' }).click();
    await d.getByRole('tab', { name: 'SLA' }).click();
    await expect(d.getByTestId('tk-sla-clock')).toBeVisible();
    await d.getByRole('tab', { name: 'Chi tiết' }).click();

    await d.getByTestId('tk-close').click();
    const box = page.getByTestId('tk-close-box');
    await expect(box.getByTestId('tk-close-ok')).toBeDisabled();
    await box.getByTestId('tk-close-reason').selectOption('resolved');
    await box.getByTestId('tk-close-ok').click();
    await expect(d.getByTestId('tk-status')).toHaveText('Đã đóng');
    await d.getByTestId('tk-reopen').click();
    await expect(d.getByTestId('tk-status')).toHaveText('Đang mở');
    await d.getByRole('button', { name: 'Đóng' }).first().click();
    await expect(page.getByTestId('tk-kpi-total-v')).toHaveText('1');
    await expect(page.getByTestId('tk-kpi-open-v')).toHaveText('1');

    // Cài đặt › SLA: chính sách mặc định thật (FRT 10′ · TTR 4 giờ).
    await page.goto('/settings/org_sla');
    await expect(page.getByTestId('st-sla')).toContainText('Mặc định');
    await expect(page.getByTestId('st-sla-esc')).toBeVisible();
  });
});
